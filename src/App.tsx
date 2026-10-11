/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Note, SyncStatus } from './types';
import {
  loadNotes,
  saveNotes,
  enrichNoteMetadata,
} from './services/storage';
import {
  getSyncRoomCode,
  subscribeToRemoteNotes,
  syncNoteToRemote,
  deleteNoteFromRemote,
} from './services/firebase';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';
import { ShoppingView } from './components/ShoppingView';
import { CalculatorView } from './components/CalculatorView';
import { EventsView } from './components/EventsView';
import { SyncAndGitHubModal } from './components/SyncAndGitHubModal';
import { ChangelogModal } from './components/ChangelogModal';
import { APP_VERSION } from './version';
import { extractShoppingItems } from './utils/shoppingParser';
import { NoteCategory } from './types';
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
} from 'lucide-react';

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [activeTab, setActiveTab] = useState<'notes' | 'shopping' | 'events' | 'calc' | 'sync'>('notes');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [shoppingTargetNote, setShoppingTargetNote] = useState<Note | null>(null);
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);

  const isOnline = useOnlineStatus();
  const roomCode = getSyncRoomCode();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConfigured: false,
    isConnected: false,
    lastSyncedAt: Date.now(),
    syncMethod: 'local',
    roomCode,
  });

  // Save notes locally whenever they change
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

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
      // Category filter
      if (activeCategoryFilter !== 'all') {
        if (activeCategoryFilter === 'note') {
          if (n.category !== 'note' && n.category !== 'general') return false;
        } else if (activeCategoryFilter === 'shopping') {
          if (n.category !== 'shopping' && (n.shoppingItemsCount || 0) === 0) return false;
        } else if (activeCategoryFilter === 'event') {
          if (n.category !== 'event') return false;
        } else if (activeCategoryFilter === 'payment') {
          if (n.category !== 'payment' && (n.cachedTotal || 0) === 0) return false;
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

  // Haptic feedback
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  // Handlers
  const handleCreateNewNote = (
    category: NoteCategory = 'note',
    defaultTitle?: string,
    eventDate?: string,
    eventTime?: string
  ) => {
    triggerHaptic();
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: defaultTitle || '',
      content:
        category === 'shopping'
          ? `Список покупок в тетради:\n- [ ] Молоко 3.2% 1 л\n- [ ] Хлеб 1 шт\n- [ ] Сыр 300 г\n- [ ] Яйца 10 шт`
          : category === 'event'
          ? `План события:\n14:00 — Встреча\nКофе-брейк: 350 * 3\nПодготовить материалы`
          : category === 'payment'
          ? `Счета к оплате:\nАренда: 35000 руб\nКоммуналка: 2400 + 850\nИнтернет: 800\n\nИтого:`
          : '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category,
      eventDate: eventDate || (category === 'event' ? new Date().toISOString().slice(0, 10) : undefined),
      eventTime: eventTime || (category === 'event' ? '14:00' : undefined),
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
      tags: [],
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
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    deleteNoteFromRemote(roomCode, id);
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

  const handleOpenShoppingFromNote = (n: Note) => {
    setSelectedNote(null);
    setShoppingTargetNote(n);
    setActiveTab('shopping');
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-[#141210] text-stone-900 dark:text-stone-100 flex flex-col font-sans select-none transition-colors duration-200">
      {/* Top Mobile App Header */}
      <Header
        syncStatus={syncStatus}
        isOnline={isOnline}
        onOpenSync={() => setActiveTab('sync')}
        onOpenChangelog={() => setIsChangelogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-3">
        {/* TAB 1: NOTES LIST */}
        {activeTab === 'notes' && (
          <div className="pb-24">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
              {[
                { id: 'all', label: 'Все записи' },
                { id: 'note', label: '📝 Просто заметки' },
                { id: 'shopping', label: '🛒 Покупки' },
                { id: 'event', label: '📅 События' },
                { id: 'payment', label: '🧮 Оплаты' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    triggerHaptic();
                    setActiveCategoryFilter(c.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 cursor-pointer ${
                    activeCategoryFilter === c.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/25'
                      : 'bg-stone-200/80 hover:bg-stone-300/80 text-stone-700 dark:bg-stone-900/80 dark:hover:bg-stone-800 dark:text-stone-300 border border-stone-300/60 dark:border-stone-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
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
                    onOpen={(n) => setSelectedNote(n)}
                    onTogglePin={handleTogglePin}
                    onOpenShopping={handleOpenShoppingFromNote}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHOPPING & WHERE TO BUY */}
        {activeTab === 'shopping' && (
          <ShoppingView
            note={shoppingTargetNote}
            allNotes={notes.filter((n) => n.category === 'shopping' || (n.shoppingItemsCount || 0) > 0)}
            onUpdateNote={handleUpdateNote}
          />
        )}

        {/* TAB 3: EVENTS & CALENDAR */}
        {activeTab === 'events' && (
          <EventsView
            notes={notes}
            onOpenNote={(n) => setSelectedNote(n)}
            onCreateEvent={(title, date, time) => handleCreateNewNote('event', title, date, time)}
            onToggleEventDone={handleToggleEventDone}
          />
        )}

        {/* TAB 4: PAYMENTS & CALCULATOR */}
        {activeTab === 'calc' && (
          <CalculatorView
            notes={notes}
            onOpenNote={(n) => setSelectedNote(n)}
            onCreatePaymentNote={() => handleCreateNewNote('payment')}
          />
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
        pendingShoppingCount={pendingShoppingCount}
        upcomingEventsCount={upcomingEventsCount}
      />

      {/* Release Notes / Changelog Modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </div>
  );
}
