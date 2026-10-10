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
import { SyncAndGitHubModal } from './components/SyncAndGitHubModal';
import { ChangelogModal } from './components/ChangelogModal';
import { APP_VERSION } from './version';
import { extractShoppingItems } from './utils/shoppingParser';
import {
  Plus,
  Search,
  Pin,
  FileText,
  Calculator,
  ShoppingCart,
  Sparkles,
  WifiOff,
} from 'lucide-react';

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [activeTab, setActiveTab] = useState<'notes' | 'shopping' | 'calc' | 'sync'>('notes');
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
  const pendingShoppingCount = useMemo(() => {
    let pending = 0;
    notes.forEach((n) => {
      const items = extractShoppingItems(n.content);
      pending += items.filter((i) => !i.isCompleted).length;
    });
    return pending;
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Category filter
      if (activeCategoryFilter !== 'all' && n.category !== activeCategoryFilter) {
        return false;
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
  const handleCreateNewNote = (category: 'payment' | 'shopping' | 'general' | 'budget' = 'general') => {
    triggerHaptic();
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      content:
        category === 'payment'
          ? `Счета к оплате:\nАренда: 35000 руб\nКоммуналка: 2400 + 850\nИнтернет: 800\n\nИтого:`
          : category === 'shopping'
          ? `Список покупок:\n- [ ] Молоко 3.2% 1 л\n- [ ] Хлеб 1 шт\n- [ ] Сыр 300 г\n- [ ] Яйца 10 шт`
          : '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category,
      color: category === 'payment' ? '#3b82f6' : category === 'shopping' ? '#10b981' : '#6366f1',
      isPinned: false,
      tags: [],
    };

    const enriched = enrichNoteMetadata(newNote);
    setNotes((prev) => [enriched, ...prev]);
    setSelectedNote(enriched);
    syncNoteToRemote(roomCode, enriched);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
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
                { id: 'all', label: 'Все заметки' },
                { id: 'payment', label: '💸 Оплаты' },
                { id: 'shopping', label: '🛒 Покупки' },
                { id: 'budget', label: '📊 Бюджет' },
                { id: 'general', label: '📝 Общее' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    triggerHaptic();
                    setActiveCategoryFilter(c.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                    activeCategoryFilter === c.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Notes Grid */}
            {filteredNotes.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-900/40 rounded-3xl border border-slate-800/80 mt-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {searchQuery ? 'Ничего не найдено' : 'Пока нет заметок'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5">
                  {searchQuery
                    ? 'Попробуйте изменить поисковый запрос'
                    : 'Создайте умную заметку для подсчета расходов или списка покупок'}
                </p>
                <button
                  onClick={() => handleCreateNewNote('payment')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать первую заметку</span>
                </button>
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
            allNotes={notes.filter((n) => (n.shoppingItemsCount || 0) > 0)}
            onUpdateNote={handleUpdateNote}
          />
        )}

        {/* TAB 3: PAYMENTS & CALCULATOR */}
        {activeTab === 'calc' && (
          <CalculatorView
            notes={notes}
            onOpenNote={(n) => setSelectedNote(n)}
            onCreatePaymentNote={() => handleCreateNewNote('payment')}
          />
        )}

        {/* TAB 4: SYNC & GITHUB */}
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
        onNewNote={() => handleCreateNewNote('general')}
        pendingShoppingCount={pendingShoppingCount}
      />

      {/* Release Notes / Changelog Modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </div>
  );
}
