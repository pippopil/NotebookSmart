import React, { useState, useMemo } from 'react';
import { Note, EVENT_CATEGORY_CONFIG } from '../types';
import { findHolidayForDate, Holiday } from '../services/holidays';
import { TimezoneMode, formatInActiveTimezone, convertEventToActiveTimezone, getActiveTodayDateStr } from '../services/timezone';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';

interface CalendarMonthWidgetProps {
  notes: Note[];
  timezoneMode: TimezoneMode;
  countryCode: string;
  onOpenNote?: (note: Note) => void;
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string;
}

export type WorkloadLevel = 'none' | 'light' | 'medium' | 'heavy';

export const CalendarMonthWidget: React.FC<CalendarMonthWidgetProps> = ({
  notes,
  timezoneMode,
  countryCode,
  onOpenNote,
  onSelectDate,
  selectedDate,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  const monthName = currentMonthDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate day densities & scheduled events per date
  // Calculate day densities & scheduled events per date according to active timezone
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of notes) {
      if (n.isArchived) continue;
      let dateKey: string | null = null;
      if (n.category === 'event' && n.eventDate) {
        // Automatically apply selected timezone to event date
        const converted = convertEventToActiveTimezone(n.eventDate, n.eventTime, timezoneMode);
        dateKey = converted.date;
      } else if (n.reminderDateTime) {
        dateKey = n.reminderDateTime.slice(0, 10);
      }
      if (dateKey) {
        const existing = map.get(dateKey) || [];
        existing.push(n);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [notes, timezoneMode]);

  // Find nearest upcoming event from now
  const nearestUpcomingEvent = useMemo(() => {
    const now = Date.now();
    let bestNote: Note | null = null;
    let bestDiff = Infinity;

    for (const n of notes) {
      if (n.isArchived || n.isEventDone) continue;

      let eventTime = 0;
      if (n.eventDate) {
        const converted = convertEventToActiveTimezone(n.eventDate, n.eventTime, timezoneMode);
        const timeStr = converted.time || '09:00';
        eventTime = new Date(`${converted.date}T${timeStr}`).getTime();
      } else if (n.reminderDateTime) {
        eventTime = new Date(n.reminderDateTime).getTime();
      }

      if (eventTime && eventTime >= now - 1000 * 60 * 60 * 2) {
        const diff = eventTime - now;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestNote = n;
        }
      }
    }
    return bestNote;
  }, [notes, timezoneMode]);

  // Helper for human-readable countdown to nearest event with active timezone label
  const getNearestEventStatus = (note: Note) => {
    const converted = convertEventToActiveTimezone(note.eventDate, note.eventTime, timezoneMode);
    const dateStr = converted.date || (note.reminderDateTime ? note.reminderDateTime.slice(0, 10) : '');
    const timeStr = converted.time || (note.reminderDateTime ? note.reminderDateTime.slice(11, 16) : '');
    const tzBadge = timezoneMode === 'default_msk' ? 'МСК' : 'местн.';
    if (!dateStr) return { label: 'Запланировано', isToday: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: `Сегодня в ${timeStr || '12:00'} (${tzBadge})`, isToday: true };
    if (diffDays === 1) return { label: `Завтра в ${timeStr || '12:00'} (${tzBadge})`, isTomorrow: true };
    if (diffDays > 1 && diffDays <= 7) return { label: `Через ${diffDays} дн. (${timeStr || ''} ${tzBadge})` };
    return {
      label: `${new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в ${timeStr || '12:00'} (${tzBadge})`,
    };
  };

  // Build calendar matrix (42 cells: 6 weeks x 7 days)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday is 0, Sunday is 6 in Russian calendar
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // Active timezone today date
    const todayStr = getActiveTodayDateStr(timezoneMode);

    const cells = [];

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().slice(0, 10);
      const dayEvents = eventsByDate.get(dateStr) || [];
      const holiday = findHolidayForDate(dateStr, countryCode);

      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        eventsCount: dayEvents.length,
        events: dayEvents,
        holiday,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().slice(0, 10);
      const dayEvents = eventsByDate.get(dateStr) || [];
      const holiday = findHolidayForDate(dateStr, countryCode);

      cells.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        eventsCount: dayEvents.length,
        events: dayEvents,
        holiday,
      });
    }

    // Next month filler days to complete rows (up to 35 or 42)
    const totalCellsNeeded = cells.length > 35 ? 42 : 35;
    const remaining = totalCellsNeeded - cells.length;
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const d = new Date(year, month + 1, nextDay);
      const dateStr = d.toISOString().slice(0, 10);
      const dayEvents = eventsByDate.get(dateStr) || [];
      const holiday = findHolidayForDate(dateStr, countryCode);

      cells.push({
        dateStr,
        dayNum: nextDay,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        eventsCount: dayEvents.length,
        events: dayEvents,
        holiday,
      });
    }

    return cells;
  }, [year, month, eventsByDate, countryCode]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentMonthDate(new Date());
  };

  return (
    <div className="bg-[#fffdfa] dark:bg-stone-900 border border-amber-900/15 dark:border-stone-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header with Month Navigation & Today Button */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-900/10 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white capitalize flex items-center gap-2">
              <span>{monthName}</span>
              <button
                onClick={handleToday}
                className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 transition cursor-pointer"
                title="Перейти к сегодняшнему числу"
              >
                Сегодня
              </button>
            </h3>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              Календарный виджет с цветовой загруженностью
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
            title="Предыдущий месяц"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
            title="Следующий месяц"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PROMINENT CARD: БЛИЖАЙШЕЕ СОБЫТИЕ */}
      {nearestUpcomingEvent ? (
        <div
          onClick={() => onOpenNote && onOpenNote(nearestUpcomingEvent)}
          className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-amber-500/10 to-purple-500/15 dark:from-purple-950/40 dark:via-stone-800 dark:to-purple-950/40 border border-purple-500/30 dark:border-purple-500/40 flex items-center justify-between gap-3 cursor-pointer hover:border-purple-500 transition group shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 mb-0.5">
                {(() => {
                  const catConfig = EVENT_CATEGORY_CONFIG[nearestUpcomingEvent.eventCategory || 'meeting'];
                  return (
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs ${catConfig.badgeClass}`}>
                      <span>{catConfig.icon}</span>
                      <span>{catConfig.label}</span>
                    </span>
                  );
                })()}
                <span className="text-xs font-bold text-purple-900 dark:text-purple-300 font-mono">
                  {getNearestEventStatus(nearestUpcomingEvent).label}
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-stone-900 dark:text-white truncate">
                {nearestUpcomingEvent.title || 'Событие без названия'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold text-xs shrink-0 group-hover:translate-x-1 transition">
            <span className="hidden sm:inline">Открыть</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5 text-xs text-stone-500 dark:text-stone-400">
          <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Нет ближайших запланированных событий на эти дни. Нажмите на любой день, чтобы добавить встречу.</span>
        </div>
      )}

      {/* MONTH CALENDAR GRID */}
      <div className="space-y-1">
        {/* Weekday headers (Пн - Вс) */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-stone-500 dark:text-stone-400 pb-1">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => (
            <div
              key={d}
              className={`py-1 ${i >= 5 ? 'text-rose-500 dark:text-rose-400 font-extrabold' : ''}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells (7 columns) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 font-mono text-xs">
          {calendarCells.map((cell) => {
            const isSelected = selectedDate === cell.dateStr;

            // Density workload color coding
            let workloadBadgeClass = '';
            let workloadDotColor = '';

            if (cell.eventsCount === 1) {
              // Light (1 event): Emerald / Mint
              workloadBadgeClass = 'border-emerald-400 dark:border-emerald-600/70 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200';
              workloadDotColor = 'bg-emerald-500';
            } else if (cell.eventsCount >= 2 && cell.eventsCount <= 3) {
              // Medium (2-3 events): Warm Amber / Orange
              workloadBadgeClass = 'border-amber-400 dark:border-amber-600/70 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200';
              workloadDotColor = 'bg-amber-500';
            } else if (cell.eventsCount >= 4) {
              // Heavy (4+ events): Rose / Purple
              workloadBadgeClass = 'border-rose-400 dark:border-rose-600/70 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200';
              workloadDotColor = 'bg-rose-500';
            }

            return (
              <div
                key={cell.dateStr}
                onClick={() => onSelectDate && onSelectDate(cell.dateStr)}
                className={`relative min-h-[52px] sm:min-h-[60px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-purple-600 bg-purple-100/80 dark:bg-purple-950/80 border-purple-500 shadow-sm z-10'
                    : cell.isToday
                    ? 'border-2 border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-2xs font-extrabold'
                    : cell.isCurrentMonth
                    ? 'bg-stone-50/70 hover:bg-stone-100 dark:bg-stone-850/60 dark:hover:bg-stone-800 border-stone-200/80 dark:border-stone-700/60'
                    : 'bg-stone-100/40 dark:bg-stone-900/30 text-stone-400 dark:text-stone-600 border-transparent hover:border-stone-200'
                }`}
              >
                {/* Top row in day cell: Day Number + Holiday Icon */}
                <div className="flex items-start justify-between">
                  <span
                    className={`font-bold text-xs ${
                      cell.isToday
                        ? 'text-amber-700 dark:text-amber-300'
                        : cell.isCurrentMonth
                        ? 'text-stone-900 dark:text-white'
                        : 'text-stone-400 dark:text-stone-600'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {cell.holiday && (
                    <span
                      className="text-[10px] select-none"
                      title={`Праздник: ${cell.holiday.name}`}
                    >
                      {cell.holiday.emoji || '🎉'}
                    </span>
                  )}
                </div>

                {/* Bottom row: Workload indicators + category dots */}
                <div className="flex items-center justify-between gap-1 mt-1">
                  {cell.eventsCount > 0 ? (
                    <div className="flex items-center justify-between w-full gap-0.5">
                      <div
                        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold border shadow-2xs ${workloadBadgeClass}`}
                        title={`Событий в этот день: ${cell.eventsCount}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${workloadDotColor} shrink-0`} />
                        <span>{cell.eventsCount}</span>
                      </div>

                      {/* Micro category color dots */}
                      <div className="flex items-center gap-0.5 shrink-0 overflow-hidden">
                        {cell.events.slice(0, 3).map((evt, idx) => {
                          const catConf = EVENT_CATEGORY_CONFIG[evt.eventCategory || 'meeting'];
                          return (
                            <span
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${catConf?.dotColor || 'bg-purple-500'} shrink-0`}
                              title={`${catConf?.label || 'Событие'}: ${evt.title}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : cell.holiday ? (
                    <span className="text-[9px] text-amber-800 dark:text-amber-400 font-bold truncate max-w-full">
                      выходной
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WORKLOAD DENSITY & CATEGORIES LEGEND */}
      <div className="pt-2 border-t border-amber-900/10 dark:border-stone-800 space-y-2 text-[11px] text-stone-500 dark:text-stone-400">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-stone-700 dark:text-stone-300">
            Загруженность:
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>1 дело</span>
            </span>
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>2–3 встречи</span>
            </span>
            <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>4+ плотно</span>
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-bold">
              <span>🎉</span>
              <span>Праздник</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-dashed border-stone-200 dark:border-stone-800 text-[10px]">
          <span className="text-stone-500 dark:text-stone-400 font-semibold mr-1">Категории:</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> 🤝 Встречи
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> ⏰ Дедлайны
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> 🎉 Праздники
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 🎂 Дни рождения
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> ✈️ Поездки
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border border-stone-300">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-500" /> 📋 Дела
          </span>
        </div>
      </div>
    </div>
  );
};
