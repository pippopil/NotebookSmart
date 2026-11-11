/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Note, SyncStatus, ArchivedBudgetMonth, ArchivedShoppingTrip, SecurityConfig, NoteCategory, EventCategory } from './types';
import {
  loadNotes,
  saveNotes,
  enrichNoteMetadata,
  loadArchivedBudgets,
  saveArchivedBudgets,
  loadArchivedShopping,
  saveArchivedShopping,
  restoreNotesFromIndexedDBIfEmpty,
} from './services/storage';
import {
  loadSecurityConfig,
  saveSecurityConfig,
  isAutoLockExpired,
} from './services/security';
import {
  getSyncRoomCode,
  subscribeToRemoteNotes,
  syncNoteToRemote,
  deleteNoteFromRemote,
} from './services/firebase';
import {
  sendPushNotification,
  subscribeToInAppAlerts,
  InAppAlert,
} from './services/notifications';
import { extractSmartTagsLocally } from './services/aiTagging';
import {
  syncWidgetFromNotes,
  scheduleNativeAlarm,
  cancelNativeAlarm,
  nativeHaptic,
  getPendingNativeSharedContent,
  getPendingNativeAction,
  saveNativeBackup,
} from './services/nativeBridge';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSwipeBack } from './hooks/useSwipeBack';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';
import { ShoppingView } from './components/ShoppingView';
import { CalculatorView } from './components/CalculatorView';
import { EventsView } from './components/EventsView';
import { ArchiveView } from './components/ArchiveView';
import { LockScreen } from './components/LockScreen';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { SyncAndGitHubModal } from './components/SyncAndGitHubModal';
import { ChangelogModal } from './components/ChangelogModal';
import { QuickTemplatesModal, NoteTemplate } from './components/QuickTemplatesModal';
import { ShareNoteModal } from './components/ShareNoteModal';
import { AboutView } from './components/AboutView';
import { APP_VERSION } from './version';
import { extractShoppingItems } from './utils/shoppingParser';
import {
  Plus,
  Search,
  Pin,
  FileText,
  Calculator,
  ShoppingCart,
  Calendar,
  Sparkles,
  WifiOff,
  Archive,
  Bell,
  X,
  Tag,
} from 'lucide-react';

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const [archivedBudgets, setArchivedBudgets] = useState<ArchivedBudgetMonth[]>(() =>
    loadArchivedBudgets()
  );
  const [archivedShopping, setArchivedShopping] = useState<ArchivedShoppingTrip[]>(() =>
    loadArchivedShopping()
  );
  const [inAppAlert, setInAppAlert] = useState<InAppAlert | null>(null);

  const [activeTab, setActiveTab] = useState<'notes' | 'shopping' | 'events' | 'calc' | 'sync' | 'archive' | 'about'>('notes');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [shoppingTargetNote, setShoppingTargetNote] = useState<Note | null>(null);
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);

  // Local Passcode & Biometric Security
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() => loadSecurityConfig());
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [lastUnlockedAt, setLastUnlockedAt] = useState<number>(0);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [pendingNoteToOpen, setPendingNoteToOpen] = useState<Note | null>(null);
  const [isLockScreenOpenForNote, setIsLockScreenOpenForNote] = useState<boolean>(false);

  // Check if a category is configured as protected
  const isCategoryProtected = (cat: string) => {
    if (!securityConfig.isPasscodeSet) return false;
    if (cat === 'calc' || cat === 'payment' || cat === 'budget') return securityConfig.protectFinance;
    if (cat === 'shopping') return securityConfig.protectShopping;
    if (cat === 'archive') return securityConfig.protectArchive;
    return false;
  };

  // Check if a category or tab is currently locked
  const isSectionLocked = (cat: string) => {
    if (!isCategoryProtected(cat)) return false;
    if (!isUnlocked) return true;
    if (isAutoLockExpired(lastUnlockedAt, securityConfig.autoLockMinutes)) {
      return true;
    }
    return false;
  };

  // Auto-lock when tab is hidden or timeout expires
  useEffect(() => {
    const handleVisibilityOrBlur = () => {
      if (!securityConfig.isPasscodeSet) return;
      if (document.visibilityState === 'hidden') {
        if (securityConfig.autoLockMinutes === 0) {
          setIsUnlocked(false);
        }
      } else if (document.visibilityState === 'visible') {
        if (isAutoLockExpired(lastUnlockedAt, securityConfig.autoLockMinutes)) {
          setIsUnlocked(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrBlur);
    };
  }, [securityConfig, lastUnlockedAt]);

  const handleUnlockSuccess = () => {
    setIsUnlocked(true);
    setLastUnlockedAt(Date.now());
    if (pendingNoteToOpen) {
      setSelectedNote(pendingNoteToOpen);
      setPendingNoteToOpen(null);
    }
    setIsLockScreenOpenForNote(false);
  };

  const handleLockNow = () => {
    setIsUnlocked(false);
    setLastUnlockedAt(0);
  };

  const isOnline = useOnlineStatus();
  const roomCode = getSyncRoomCode();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConfigured: false,
    isConnected: false,
    lastSyncedAt: Date.now(),
    syncMethod: 'local',
    roomCode,
  });

  // Auto-restore user notes from IndexedDB if localStorage was cleared during app update
  useEffect(() => {
    restoreNotesFromIndexedDBIfEmpty().then((recovered) => {
      if (recovered && recovered.length > 0) {
        setNotes((prevNotes) => {
          if (prevNotes.length === 0) {
            return recovered.map(enrichNoteMetadata);
          }
          return prevNotes;
        });
      }
    });
  }, []);

  // Save notes locally whenever they change & sync with Android Home Screen Widget
  useEffect(() => {
    saveNotes(notes);
    syncWidgetFromNotes(notes);
  }, [notes]);

  // Save archived budgets locally
  useEffect(() => {
    saveArchivedBudgets(archivedBudgets);
  }, [archivedBudgets]);

  // Save archived shopping locally
  useEffect(() => {
    saveArchivedShopping(archivedShopping);
  }, [archivedShopping]);

  // Listen to in-app notification alerts
  useEffect(() => {
    const unsub = subscribeToInAppAlerts((alert) => {
      setInAppAlert(alert);
    });
    return () => unsub();
  }, []);

  // Step 3: Handle native Android launcher shortcuts and incoming shared content (ACTION_SEND)
  useEffect(() => {
    const handleSharedText = (title: string, text: string) => {
      if (!text || !text.trim()) return;
      nativeHaptic('success');

      const isShopping = text.includes('- [ ]') || /купить|список покупок|магазин/i.test(title + ' ' + text);
      const category: NoteCategory = isShopping ? 'shopping' : 'note';

      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim() || (isShopping ? '🛒 Список из приложения' : '📝 Принятая заметка'),
        content: text.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        category,
        paperStyle: 'grid',
        isPinned: true,
        tags: extractSmartTagsLocally(title, text, category),
      };

      const enriched = enrichNoteMetadata(newNote);
      setNotes((prev) => [enriched, ...prev]);
      setSelectedNote(enriched);
      setActiveTab('notes');
      syncNoteToRemote(roomCode, enriched);
    };

    const handleNativeAction = (action: string) => {
      if (!action) return;
      nativeHaptic('medium');
      if (action === 'new-note') {
        handleCreateNewNote('note');
      } else if (action === 'shopping') {
        setActiveTab('shopping');
      } else if (action === 'calc') {
        setActiveTab('calc');
      } else if (action === 'event') {
        handleCreateNewNote('event');
      }
    };

    // 1. Check if app was started with pending shared content or shortcut
    const pendingShare = getPendingNativeSharedContent();
    if (pendingShare && pendingShare.text) {
      handleSharedText(pendingShare.title, pendingShare.text);
    }

    const pendingAct = getPendingNativeAction();
    if (pendingAct) {
      handleNativeAction(pendingAct);
    }

    // 2. Set global window callbacks for runtime events (when app is already running in background)
    window.onNativeSharedContent = (title: string, text: string) => {
      handleSharedText(title, text);
    };

    window.onNativeAction = (action: string) => {
      handleNativeAction(action);
    };

    return () => {
      delete window.onNativeSharedContent;
      delete window.onNativeAction;
    };
  }, [roomCode]);

  // Periodic Reminder / Push Notification Dispatcher
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      let updatedAny = false;

      setNotes((prevNotes) => {
        const nextNotes = prevNotes.map((n) => {
          if (!n.reminderEnabled || n.reminderTriggered) return n;

          let shouldTrigger = false;
          let reminderTime = 0;

          if (n.reminderDateTime) {
            const t = new Date(n.reminderDateTime).getTime();
            if (!isNaN(t) && now >= t) {
              shouldTrigger = true;
              reminderTime = t;
            }
          } else if (n.category === 'event' && n.eventDate && n.eventTime) {
            const t = new Date(`${n.eventDate}T${n.eventTime}`).getTime();
            if (!isNaN(t) && now >= t) {
              shouldTrigger = true;
              reminderTime = t;
            }
          }

          // Trigger if due and not more than 24 hours in the past
          if (shouldTrigger && now - reminderTime < 24 * 60 * 60 * 1000) {
            updatedAny = true;
            const title =
              n.category === 'shopping'
                ? `🛒 Напоминание о покупках: ${n.title || 'Список товаров'}`
                : `📅 Событие наступило: ${n.title || 'Событие в тетради'}`;
            const body =
              n.content.trim().slice(0, 100) ||
              (n.category === 'shopping'
                ? 'Пора проверить список покупок в NotebookSmart'
                : 'Время запланированного мероприятия');

            sendPushNotification(title, {
              body,
              noteId: n.id,
              category: (n.category === 'shopping' || n.category === 'event' ? n.category : 'note'),
            });

            return {
              ...n,
              reminderTriggered: true,
            };
          }

          return n;
        });

        return updatedAny ? nextNotes : prevNotes;
      });
    };

    checkReminders();
    const intervalId = setInterval(checkReminders, 12000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkReminders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Firebase remote synchronization listener
  useEffect(() => {
    const unsub = subscribeToRemoteNotes(
      roomCode,
      (remoteNotes) => {
        if (remoteNotes.length > 0) {
          setNotes((prevNotes) => {
            // Merge remote notes with local notes (remote wins if newer)
            const map = new Map<string, Note>();
            prevNotes.forEach((n) => map.set(n.id, n));
            remoteNotes.forEach((rn) => {
              const local = map.get(rn.id);
              if (!local || rn.updatedAt >= local.updatedAt) {
                map.set(rn.id, enrichNoteMetadata(rn));
              }
            });
            return Array.from(map.values()).sort((a, b) => {
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              return b.updatedAt - a.updatedAt;
            });
          });
          setSyncStatus((prev) => ({
            ...prev,
            isConnected: true,
            isConfigured: true,
            lastSyncedAt: Date.now(),
          }));
        }
      },
      () => {
        setSyncStatus((prev) => ({
          ...prev,
          isConnected: false,
        }));
      }
    );

    return () => unsub();
  }, [roomCode]);

  // Count pending shopping items
  // Count pending shopping items
  const pendingShoppingCount = useMemo(() => {
    let pending = 0;
    notes.forEach((n) => {
      const items = extractShoppingItems(n.content);
      pending += items.filter((i) => !i.isCompleted).length;
    });
    return pending;
  }, [notes]);

  // Count upcoming events
  const upcomingEventsCount = useMemo(() => {
    return notes.filter((n) => n.category === 'event' && !n.isEventDone).length;
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Archive filter behavior
      if (activeCategoryFilter !== 'archive' && n.isArchived) {
        return false;
      }
      if (activeCategoryFilter === 'archive' && !n.isArchived) {
        return false;
      }

      // Category filter
      if (activeCategoryFilter !== 'all' && activeCategoryFilter !== 'archive') {
        if (activeCategoryFilter === 'note') {
          if (n.category !== 'note' && n.category !== 'general') return false;
        } else if (activeCategoryFilter === 'shopping') {
          if (n.category !== 'shopping' && (n.shoppingItemsCount || 0) === 0) return false;
        } else if (activeCategoryFilter === 'event') {
          if (n.category !== 'event') return false;
        } else if (activeCategoryFilter === 'payment') {
          if (n.category !== 'payment' && n.category !== 'budget') return false;
        } else if (activeCategoryFilter === 'calculation') {
          if (n.category !== 'calculation') return false;
        } else if (n.category !== activeCategoryFilter) {
          return false;
        }
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesContent = n.content.toLowerCase().includes(q);
        const matchesTags = n.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [notes, activeCategoryFilter, searchQuery]);

  // Haptic feedback (Native Android Vibrator with browser fallback)
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    nativeHaptic(style);
  };

  // Handlers
  const handleCreateNewNote = (
    category: NoteCategory = 'note',
    defaultTitle?: string,
    eventDate?: string,
    eventTime?: string,
    eventCategory?: EventCategory
  ) => {
    triggerHaptic();
    const initialContent =
      category === 'shopping'
        ? `Список покупок в тетради:\n- [ ] Молоко 3.2% 1 л\n- [ ] Хлеб 1 шт\n- [ ] Сыр 300 г\n- [ ] Яйца 10 шт`
        : category === 'event'
        ? `План события:\n14:00 — Встреча\nКофе-брейк: 350 * 3\nПодготовить материалы`
        : category === 'payment'
        ? `Учет финансов в тетрадке:\n\n=== Доходы ===\n+ Зарплата: 95 000 руб\n+ Премия: 15 000\n\n=== Расходы ===\n- Аренда квартиры: 35 000 руб\n- Продукты: 18 500\n- Коммуналка: 4 500\n\nОстаток в итоге:`
        : '';

    const initialTags = initialContent
      ? extractSmartTagsLocally(defaultTitle || '', initialContent, category)
      : [];

    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: defaultTitle || '',
      content: initialContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category,
      eventDate: eventDate || (category === 'event' ? new Date().toISOString().slice(0, 10) : undefined),
      eventTime: eventTime || (category === 'event' ? '14:00' : undefined),
      eventCategory: eventCategory || (category === 'event' ? 'meeting' : undefined),
      isEventDone: false,
      paperStyle: 'grid',
      color:
        category === 'note'
          ? '#3b82f6'
          : category === 'shopping'
          ? '#10b981'
          : category === 'event'
          ? '#8b5cf6'
          : '#6366f1',
      isPinned: false,
      tags: initialTags,
    };

    const enriched = enrichNoteMetadata(newNote);
    setNotes((prev) => [enriched, ...prev]);
    setSelectedNote(enriched);
    syncNoteToRemote(roomCode, enriched);
  };

  const handleApplyTemplate = (tpl: NoteTemplate) => {
    triggerHaptic();
    const templateTags = extractSmartTagsLocally(tpl.title, tpl.content, tpl.category);
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: tpl.title,
      content: tpl.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category: tpl.category,
      paperStyle: tpl.paperStyle,
      isPinned: false,
      tags: templateTags.length > 0 ? templateTags : [tpl.category === 'payment' ? '#finances' : tpl.category === 'shopping' ? '#shopping' : '#personal'],
    };
    const enriched = enrichNoteMetadata(newNote);
    setNotes((prev) => [enriched, ...prev]);
    setSelectedNote(enriched);
    syncNoteToRemote(roomCode, enriched);
  };

  const handleToggleEventDone = (eventNote: Note) => {
    const updated: Note = {
      ...eventNote,
      isEventDone: !eventNote.isEventDone,
      updatedAt: Date.now(),
    };
    handleUpdateNote(updated);
  };

  const handleUpdateNote = (updated: Note) => {
    const enriched = enrichNoteMetadata(updated);
    setNotes((prev) => prev.map((n) => (n.id === enriched.id ? enriched : n)));
    syncNoteToRemote(roomCode, enriched);

    // Sync native exact AlarmManager for reminders
    if (enriched.reminderEnabled && !enriched.reminderTriggered) {
      let triggerTime = 0;
      if (enriched.reminderDateTime) {
        triggerTime = new Date(enriched.reminderDateTime).getTime();
      } else if (enriched.category === 'event' && enriched.eventDate && enriched.eventTime) {
        triggerTime = new Date(`${enriched.eventDate}T${enriched.eventTime}`).getTime();
      }
      if (triggerTime > Date.now()) {
        const title =
          enriched.category === 'shopping'
            ? `🛒 Напоминание: ${enriched.title || 'Список покупок'}`
            : `📅 Событие: ${enriched.title || 'Событие в тетради'}`;
        const body =
          enriched.content.trim().slice(0, 100) ||
          (enriched.category === 'shopping'
            ? 'Пора проверить список покупок в NotebookSmart'
            : 'Время запланированного мероприятия');
        scheduleNativeAlarm(enriched.id, title, body, triggerTime, enriched.category);
      } else {
        cancelNativeAlarm(enriched.id);
      }
    } else {
      cancelNativeAlarm(enriched.id);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    deleteNoteFromRemote(roomCode, id);
    cancelNativeAlarm(id);
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const handleTogglePin = (noteId: string) => {
    triggerHaptic();
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n));
      return updated.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
    });
  };

  const handleOpenNote = (note: Note) => {
    triggerHaptic();
    if (isSectionLocked(note.category)) {
      setPendingNoteToOpen(note);
      setIsLockScreenOpenForNote(true);
      return;
    }
    setSelectedNote(note);
  };

  const handleOpenShoppingFromNote = (n: Note) => {
    triggerHaptic();
    if (isSectionLocked('shopping')) {
      setPendingNoteToOpen(n);
      setIsLockScreenOpenForNote(true);
      return;
    }
    setSelectedNote(null);
    setShoppingTargetNote(n);
    setActiveTab('shopping');
  };

  // Archive Handlers
  const handleCloseCurrentMonth = (
    monthName: string,
    selectedNoteIds: string[],
    comment?: string
  ) => {
    triggerHaptic();
    const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
    let totalIncome = 0;
    let totalExpenses = 0;

    selectedNotes.forEach((n) => {
      totalIncome += n.cachedIncome || 0;
      totalExpenses += n.cachedExpenses || 0;
    });

    const netBalance = totalIncome - totalExpenses;

    const newArchivedMonth: ArchivedBudgetMonth = {
      id: `archive-budget-${Date.now()}`,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      monthName,
      closedAt: Date.now(),
      totalIncome,
      totalExpenses,
      netBalance,
      currency: selectedNotes[0]?.currency || 'руб',
      notesCount: selectedNotes.length,
      summaryComment: comment,
      notesSnapshot: selectedNotes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        income: n.cachedIncome || 0,
        expenses: n.cachedExpenses || 0,
        balance: n.cachedNetBalance || 0,
      })),
    };

    setArchivedBudgets((prev) => [newArchivedMonth, ...prev]);

    // Mark selected notes as archived so they don't clutter the active list
    setNotes((prev) =>
      prev.map((n) =>
        selectedNoteIds.includes(n.id)
          ? { ...n, isArchived: true, archivedMonth: monthName, archivedAt: Date.now() }
          : n
      )
    );
  };

  const handleArchiveCompletedShoppingNotes = () => {
    triggerHaptic();
    const notesToArchive = notes.filter((n) => {
      if (n.isArchived) return false;
      const items = extractShoppingItems(n.content);
      return items.length > 0 && items.every((i) => i.isCompleted);
    });

    if (notesToArchive.length === 0) return;

    const newTrips: ArchivedShoppingTrip[] = notesToArchive.map((n) => {
      const items = extractShoppingItems(n.content);
      return {
        id: `archive-shopping-${n.id}-${Date.now()}`,
        sourceNoteId: n.id,
        title: n.title || 'Завершенный список покупок',
        completedAt: Date.now(),
        monthName: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
        itemsCount: items.length,
        totalSpent: n.cachedTotal,
        currency: n.currency || 'руб',
        items: items.map((i) => ({
          name: i.name,
          category: i.category,
          estimatedPrice: i.estimatedPriceRub,
          isCompleted: true,
        })),
      };
    });

    setArchivedShopping((prev) => [...newTrips, ...prev]);

    const idsToArchive = new Set(notesToArchive.map((n) => n.id));
    setNotes((prev) =>
      prev.map((n) =>
        idsToArchive.has(n.id)
          ? { ...n, isArchived: true, archivedAt: Date.now() }
          : n
      )
    );
  };

  const handleRestoreNote = (restoredNote: Note) => {
    const enriched = enrichNoteMetadata(restoredNote);
    setNotes((prev) => [enriched, ...prev]);
    setSelectedNote(enriched);
    syncNoteToRemote(roomCode, enriched);
  };

  // Mobile swipe navigation: swiping horizontally returns to the main notes tab without minimizing app
  useSwipeBack({
    onBack: () => {
      triggerHaptic();
      if (selectedNote) {
        setSelectedNote(null);
      } else if (activeTab !== 'notes') {
        setActiveTab('notes');
      }
    },
    enabled: activeTab !== 'notes' || selectedNote !== null,
  });

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-[#141210] text-stone-900 dark:text-stone-100 flex flex-col font-sans select-none transition-colors duration-200">
      {/* In-App Push Reminder Toast Banner */}
      {inAppAlert && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto bg-stone-900/95 dark:bg-stone-100/95 text-white dark:text-stone-900 p-4 rounded-3xl shadow-2xl backdrop-blur-md border border-amber-500/30 animate-in fade-in slide-in-from-top-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 dark:text-amber-600 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400 dark:text-amber-600 mb-0.5">
                {inAppAlert.category === 'shopping' ? '🛒 Покупки' : '📅 Событие'}
              </h4>
              <p className="font-extrabold text-sm text-white dark:text-stone-900">
                {inAppAlert.title}
              </p>
              {inAppAlert.body && (
                <p className="text-xs text-stone-300 dark:text-stone-600 mt-0.5 line-clamp-2">
                  {inAppAlert.body}
                </p>
              )}
              {inAppAlert.noteId && (
                <button
                  onClick={() => {
                    const target = notes.find((n) => n.id === inAppAlert.noteId);
                    if (target) {
                      setSelectedNote(target);
                    }
                    setInAppAlert(null);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-400 dark:text-amber-600 underline hover:no-underline cursor-pointer"
                >
                  <span>Открыть страницу в тетрадке</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setInAppAlert(null)}
            className="p-1 text-stone-400 hover:text-white dark:hover:text-stone-900 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Mobile App Header */}
      <Header
        syncStatus={syncStatus}
        isOnline={isOnline}
        onOpenSync={() => setActiveTab('sync')}
        onOpenChangelog={() => setIsChangelogOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        isSecurityConfigured={securityConfig.isPasscodeSet}
        isUnlocked={isUnlocked}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-3">
        {/* TAB 1: NOTES LIST */}
        {activeTab === 'notes' && (
          <div className="pb-24">
            {/* Responsive Category Filter Tabs (Fits cleanly across mobile screens) */}
            <div className="relative mb-3">
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
                {[
                  { id: 'all', label: 'Все записи', shortLabel: 'Все', icon: '📋' },
                  { id: 'note', label: 'Заметки (без счёта)', shortLabel: 'Заметки', icon: '📝' },
                  { id: 'payment', label: 'Финансы (деньги ₽)', shortLabel: 'Финансы', icon: '💰' },
                  { id: 'calculation', label: 'Расчёт (штуки/счёт)', shortLabel: 'Расчёт', icon: '🧮' },
                  { id: 'shopping', label: 'Покупки', shortLabel: 'Покупки', icon: '🛒' },
                  { id: 'event', label: 'События', shortLabel: 'События', icon: '📅' },
                  { id: 'archive', label: 'Архив', shortLabel: 'Архив', icon: '📦' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      triggerHaptic();
                      setActiveCategoryFilter(c.id);
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 cursor-pointer shrink-0 ${
                      activeCategoryFilter === c.id
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-stone-200/90 hover:bg-stone-300 text-stone-800 dark:bg-stone-900/80 dark:hover:bg-stone-800 dark:text-stone-300 border border-stone-300/80 dark:border-stone-800'
                    }`}
                  >
                    <span className="text-xs">{c.icon}</span>
                    <span className="text-[11px] sm:text-xs">{c.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Tag Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3 text-xs">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold shrink-0 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 text-amber-500" />
                <span>Теги:</span>
              </span>
              {['#work', '#personal', '#urgent', '#shopping', '#finances', '#health'].map((tg) => {
                const isSelected = searchQuery.toLowerCase().includes(tg.toLowerCase());
                return (
                  <button
                    key={tg}
                    onClick={() => {
                      triggerHaptic();
                      setSearchQuery(isSelected ? '' : tg);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition active:scale-95 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700'
                    }`}
                  >
                    {tg}
                  </button>
                );
              })}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[11px] text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer ml-1 whitespace-nowrap"
                >
                  Сбросить ({searchQuery})
                </button>
              )}
            </div>

            {/* Notes Grid */}
            {filteredNotes.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white dark:bg-stone-900/60 rounded-3xl border border-amber-900/10 dark:border-stone-800 shadow-sm mt-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1">
                  {searchQuery ? 'Ничего не найдено' : 'Пока нет записей'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mb-5">
                  {searchQuery
                    ? 'Попробуйте изменить поисковый запрос'
                    : 'Создайте страницу в тетради: заметку, список покупок или событие'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => handleCreateNewNote('note')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Просто заметка</span>
                  </button>
                  <button
                    onClick={() => handleCreateNewNote('payment')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Финансы (деньги)</span>
                  </button>
                  <button
                    onClick={() => handleCreateNewNote('calculation')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Расчёт (штуки/счёт)</span>
                  </button>
                  <button
                    onClick={() => handleCreateNewNote('shopping')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Покупки</span>
                  </button>
                  <button
                    onClick={() => handleCreateNewNote('event')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Событие</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isLocked={isSectionLocked(note.category)}
                    onOpen={handleOpenNote}
                    onTogglePin={handleTogglePin}
                    onOpenShopping={handleOpenShoppingFromNote}
                    onTagClick={(tag) => setSearchQuery(tag)}
                    onShare={(n) => setSharingNote(n)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHOPPING & WHERE TO BUY */}
        {activeTab === 'shopping' && (
          isSectionLocked('shopping') ? (
            <div className="py-6">
              <LockScreen
                category="shopping"
                title="Списки покупок под защитой"
                subtitle="Введите PIN-код или используйте биометрию для доступа к спискам товаров"
                biometricEnabled={securityConfig.biometricEnabled}
                credentialId={securityConfig.credentialId}
                onUnlock={handleUnlockSuccess}
                onCancel={() => setActiveTab('notes')}
              />
            </div>
          ) : (
            <ShoppingView
              note={shoppingTargetNote}
              allNotes={notes.filter((n) => n.category === 'shopping' || (n.shoppingItemsCount || 0) > 0)}
              onUpdateNote={handleUpdateNote}
            />
          )
        )}

        {/* TAB 3: EVENTS & CALENDAR */}
        {activeTab === 'events' && (
          <EventsView
            notes={notes}
            onOpenNote={handleOpenNote}
            onCreateEvent={(title, date, time, eventCategory) => handleCreateNewNote('event', title, date, time, eventCategory)}
            onToggleEventDone={handleToggleEventDone}
          />
        )}

        {/* TAB 4: PAYMENTS & CALCULATOR */}
        {activeTab === 'calc' && (
          isSectionLocked('calc') ? (
            <div className="py-6">
              <LockScreen
                category="payment"
                title="Финансы & Бюджет под защитой"
                subtitle="Введите PIN-код или используйте биометрию для просмотра баланса, доходов и расходов"
                biometricEnabled={securityConfig.biometricEnabled}
                credentialId={securityConfig.credentialId}
                onUnlock={handleUnlockSuccess}
                onCancel={() => setActiveTab('notes')}
              />
            </div>
          ) : (
            <CalculatorView
              notes={notes}
              onOpenNote={handleOpenNote}
              onCreatePaymentNote={() => handleCreateNewNote('payment')}
            />
          )
        )}

        {/* TAB 5: SYNC & GITHUB */}
        {activeTab === 'sync' && (
          <SyncAndGitHubModal
            syncStatus={syncStatus}
            notes={notes}
            onImportNotes={(imported) => {
              setNotes(imported.map(enrichNoteMetadata));
              saveNotes(imported);
            }}
            onRefreshSync={() => {
              setSyncStatus((prev) => ({
                ...prev,
                lastSyncedAt: Date.now(),
              }));
            }}
          />
        )}

        {/* TAB 6: ARCHIVE OF PAST MONTHS & COMPLETED SHOPPING */}
        {activeTab === 'archive' && (
          isSectionLocked('archive') ? (
            <div className="py-6">
              <LockScreen
                category="archive"
                title="Архив данных под защитой"
                subtitle="Введите PIN-код или используйте биометрию для доступа к закрытым периодам"
                biometricEnabled={securityConfig.biometricEnabled}
                credentialId={securityConfig.credentialId}
                onUnlock={handleUnlockSuccess}
                onCancel={() => setActiveTab('notes')}
              />
            </div>
          ) : (
            <ArchiveView
              notes={notes}
              archivedBudgets={archivedBudgets}
              archivedShopping={archivedShopping}
              onSaveArchivedBudgets={setArchivedBudgets}
              onSaveArchivedShopping={setArchivedShopping}
              onRestoreNote={handleRestoreNote}
              onCloseCurrentMonth={handleCloseCurrentMonth}
              onArchiveCompletedShoppingNotes={handleArchiveCompletedShoppingNotes}
            />
          )
        )}

        {/* TAB 7: ABOUT APP (Информация о приложении, версия сборки, лицензия) */}
        {activeTab === 'about' && (
          <AboutView
            notes={notes}
            onOpenChangelog={() => setIsChangelogOpen(true)}
            onOpenSecurity={() => setIsSecurityModalOpen(true)}
            onRestoreNotes={(importedNotes) => {
              const enriched = importedNotes.map(enrichNoteMetadata);
              setNotes((prev) => [...enriched, ...prev]);
              saveNotes([...enriched, ...notes]);
            }}
          />
        )}
      </main>

      {/* Fullscreen Note Editor Modal / View */}
      {selectedNote && (
        <NoteEditor
          note={selectedNote}
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
          onClose={() => setSelectedNote(null)}
          onOpenShopping={handleOpenShoppingFromNote}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          triggerHaptic();
          if (tab === 'shopping') {
            setShoppingTargetNote(null);
          }
          setActiveTab(tab);
        }}
        onNewNote={(cat) => handleCreateNewNote(cat)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        pendingShoppingCount={pendingShoppingCount}
        upcomingEventsCount={upcomingEventsCount}
      />

      {/* Release Notes / Changelog Modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />

      {/* Everyday Quick Life Templates Modal */}
      <QuickTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* In-place Note Lock Screen Dialog */}
      {isLockScreenOpenForNote && pendingNoteToOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fffdfa] dark:bg-[#1a1715] rounded-3xl border border-amber-900/20 dark:border-stone-800 shadow-2xl max-w-sm w-full p-2 relative">
            <LockScreen
              category={
                pendingNoteToOpen.category === 'payment'
                  ? 'payment'
                  : pendingNoteToOpen.category === 'shopping'
                  ? 'shopping'
                  : 'general'
              }
              title={pendingNoteToOpen.title ? `Защищено: ${pendingNoteToOpen.title}` : undefined}
              biometricEnabled={securityConfig.biometricEnabled}
              credentialId={securityConfig.credentialId}
              onUnlock={handleUnlockSuccess}
              onCancel={() => {
                setIsLockScreenOpenForNote(false);
                setPendingNoteToOpen(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Security and Passcode Settings Modal */}
      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        config={securityConfig}
        onUpdateConfig={(newCfg: SecurityConfig) => {
          setSecurityConfig(newCfg);
          saveSecurityConfig(newCfg);
        }}
        onLockNow={handleLockNow}
        isCurrentlyUnlocked={isUnlocked}
      />

      {/* Social Media Share Modal from Cards */}
      {sharingNote && (
        <ShareNoteModal
          note={sharingNote}
          isOpen={Boolean(sharingNote)}
          onClose={() => setSharingNote(null)}
        />
      )}
    </div>
  );
}
