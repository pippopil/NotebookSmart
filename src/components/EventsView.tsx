import React, { useState } from 'react';
import { Note } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface EventsViewProps {
  notes: Note[];
  onOpenNote: (note: Note) => void;
  onCreateEvent: (title?: string, date?: string, time?: string) => void;
  onToggleEventDone: (note: Note) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  notes,
  onOpenNote,
  onCreateEvent,
  onToggleEventDone,
}) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'done'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState('12:00');
  const [showQuickForm, setShowQuickForm] = useState(false);

  // Filter only event notes
  const eventNotes = notes.filter((n) => n.category === 'event');

  const filteredEvents = eventNotes.filter((n) => {
    if (filter === 'upcoming') return !n.isEventDone;
    if (filter === 'done') return n.isEventDone;
    return true;
  });

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateEvent(newTitle.trim(), newDate, newTime);
    setNewTitle('');
    setShowQuickForm(false);
  };

  // Helper for human-readable date status
  const getEventCountdown = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'Сегодня', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30' };
    if (diffDays === 1) return { label: 'Завтра', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30' };
    if (diffDays > 1 && diffDays <= 7) return { label: `Через ${diffDays} дн.`, color: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-500/30' };
    if (diffDays < 0) return { label: 'Прошедшее', color: 'text-stone-500 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700' };
    return { label: new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), color: 'text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700' };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28">
      {/* Top Banner */}
      <div className="bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 rounded-3xl p-5 mb-5 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <Calendar className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                События и планы в тетради
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Встречи, мероприятия и напоминания с датами и временем
            </p>
          </div>

          <button
            onClick={() => setShowQuickForm(!showQuickForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Новое событие</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-900/10 dark:border-stone-800">
          {[
            { id: 'all', label: `Все (${eventNotes.length})` },
            { id: 'upcoming', label: `Предстоящие (${eventNotes.filter((n) => !n.isEventDone).length})` },
            { id: 'done', label: `Выполненные (${eventNotes.filter((n) => n.isEventDone).length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filter === f.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 border border-stone-200 dark:border-stone-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Event Creation Form */}
      {showQuickForm && (
        <form
          onSubmit={handleQuickSubmit}
          className="bg-white dark:bg-stone-900 border border-purple-400/50 dark:border-purple-500/40 rounded-3xl p-5 mb-5 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-3 transition-colors"
        >
          <div className="flex items-center justify-between pb-2 border-b border-amber-900/10 dark:border-stone-800">
            <span className="text-xs font-bold text-stone-900 dark:text-white">Добавить событие в тетрадь</span>
            <button
              type="button"
              onClick={() => setShowQuickForm(false)}
              className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">Название события:</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Встреча, поездка, день рождения..."
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-purple-500 font-medium"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">Дата:</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="w-28">
              <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">Время:</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowQuickForm(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition"
            >
              Сохранить событие
            </button>
          </div>
        </form>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white dark:bg-stone-900/60 rounded-3xl border border-amber-900/10 dark:border-stone-800">
            <Calendar className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
            <h4 className="font-bold text-stone-900 dark:text-white text-sm mb-1">
              {filter === 'done' ? 'Нет завершенных событий' : 'Событий пока нет'}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
              Создайте событие или добавьте запись с категорией «События»
            </p>
          </div>
        ) : (
          filteredEvents.map((eventNote) => {
            const badge = getEventCountdown(eventNote.eventDate, eventNote.eventTime);
            return (
              <div
                key={eventNote.id}
                onClick={() => onOpenNote(eventNote)}
                className={`group p-4 rounded-2xl border transition shadow-xs cursor-pointer flex items-center justify-between gap-3 ${
                  eventNote.isEventDone
                    ? 'bg-stone-50 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800/60 opacity-60'
                    : 'bg-white dark:bg-stone-900 border-amber-900/10 dark:border-stone-800 hover:border-purple-500/50 dark:hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleEventDone(eventNote);
                    }}
                    className={`p-1.5 rounded-xl border transition ${
                      eventNote.isEventDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200 dark:border-stone-700 hover:border-purple-400'
                    }`}
                    title={eventNote.isEventDone ? 'Снять отметку' : 'Отметить выполненным'}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${eventNote.isEventDone ? 'fill-emerald-500/20' : ''}`} />
                  </button>

                  <div className="min-w-0">
                    <h4
                      className={`font-bold text-sm truncate ${
                        eventNote.isEventDone
                          ? 'line-through text-stone-400 dark:text-stone-500'
                          : 'text-stone-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300'
                      }`}
                    >
                      {eventNote.title || 'Безымянное событие'}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                      {eventNote.eventDate && (
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span>{new Date(eventNote.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        </span>
                      )}
                      {eventNote.eventTime && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span>{eventNote.eventTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
