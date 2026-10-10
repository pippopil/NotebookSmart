import React, { useState } from 'react';
import { Note } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  Tag,
  ArrowRight,
  AlertCircle,
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

    if (diffDays === 0) return { label: 'Сегодня', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
    if (diffDays === 1) return { label: 'Завтра', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
    if (diffDays > 1 && diffDays <= 7) return { label: `Через ${diffDays} дн.`, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' };
    if (diffDays < 0) return { label: 'Прошедшее', color: 'text-slate-500 bg-slate-800 border-slate-700' };
    return { label: new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), color: 'text-slate-300 bg-slate-800 border-slate-700' };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
                <Calendar className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                События и планы в тетради
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Встречи, мероприятия и напоминания с датами и временем
            </p>
          </div>

          <button
            onClick={() => setShowQuickForm(!showQuickForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Новое событие</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
          {[
            { id: 'all', label: `Все (${eventNotes.length})` },
            { id: 'upcoming', label: `Предстоящие (${eventNotes.filter((n) => !n.isEventDone).length})` },
            { id: 'done', label: `Выполненные (${eventNotes.filter((n) => n.isEventDone).length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filter === f.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
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
          className="bg-slate-900 border border-purple-500/40 rounded-3xl p-5 mb-5 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white">Добавить событие в тетрадь</span>
            <button
              type="button"
              onClick={() => setShowQuickForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Название события:</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Например: Встреча с коллегами, Запись к врачу..."
              className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Дата:</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Время:</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowQuickForm(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition"
            >
              Записать событие
            </button>
          </div>
        </form>
      )}

      {/* Events List on Graph Notebook Cards */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 rounded-3xl border border-slate-800/80">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Нет событий</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
            Запланируйте встречу, дедлайн или важное мероприятие на страницах тетради
          </p>
          <button
            onClick={() => setShowQuickForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Создать событие</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((ev) => {
            const countdown = getEventCountdown(ev.eventDate, ev.eventTime);

            return (
              <div
                key={ev.id}
                onClick={() => onOpenNote(ev)}
                className={`group relative notebook-grid-dark rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl border overflow-hidden ${
                  ev.isEventDone
                    ? 'border-slate-800 opacity-60'
                    : 'border-slate-700/80 hover:border-purple-500/50'
                }`}
              >
                {/* Spiral binder border */}
                <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-purple-950 via-slate-800 to-purple-950 border-r border-slate-700/80" />
                {/* Margin red line */}
                <div className="absolute left-6 top-0 bottom-0 w-[1.5px] bg-rose-500/40 pointer-events-none" />

                <div className="pl-6 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {countdown && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${countdown.color}`}
                        >
                          {countdown.label}
                        </span>
                      )}

                      {(ev.eventDate || ev.eventTime) && (
                        <span className="flex items-center gap-1 text-xs text-purple-300 font-mono">
                          <Clock className="w-3 h-3 text-purple-400" />
                          <span>
                            {ev.eventDate
                              ? new Date(ev.eventDate).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                })
                              : ''}
                            {ev.eventTime ? ` в ${ev.eventTime}` : ''}
                          </span>
                        </span>
                      )}
                    </div>

                    <h3
                      className={`font-bold text-base transition ${
                        ev.isEventDone
                          ? 'line-through text-slate-500'
                          : 'text-white group-hover:text-purple-300'
                      }`}
                    >
                      {ev.title || 'Безымянное событие'}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 font-mono">
                      {ev.content || 'Нет описания...'}
                    </p>
                  </div>

                  {/* Toggle Done Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleEventDone(ev);
                    }}
                    className="p-1 text-purple-400 hover:text-purple-300 transition shrink-0"
                    title={ev.isEventDone ? 'Вернуть в активные' : 'Отметить выполненным'}
                  >
                    {ev.isEventDone ? (
                      <CheckCircle2 className="w-6 h-6 fill-emerald-500/20 text-emerald-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-500 hover:text-purple-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
