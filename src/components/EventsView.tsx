import React, { useState, useEffect, useMemo } from 'react';
import { Note } from '../types';
import { CalendarMonthWidget } from './CalendarMonthWidget';
import {
  SUPPORTED_COUNTRIES,
  CountryOption,
  detectCountryFromTimezone,
  getCountryHolidays,
  findHolidayForDate,
  Holiday,
} from '../services/holidays';
import {
  TimezoneMode,
  getSavedTimezoneMode,
  saveTimezoneMode,
  getTimezoneLabel,
  getActiveTimezone,
} from '../services/timezone';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Globe,
  MapPin,
  Sparkles,
  ChevronRight,
  Check,
  ChevronDown,
  Flame,
  CalendarDays,
  Bell,
} from 'lucide-react';

interface EventsViewProps {
  notes: Note[];
  onOpenNote: (note: Note) => void;
  onCreateEvent: (title?: string, date?: string, time?: string) => void;
  onToggleEventDone: (note: Note) => void;
}

export type HolidayMode = 'my_country' | 'current_location' | 'manual_select';

export const EventsView: React.FC<EventsViewProps> = ({
  notes,
  onOpenNote,
  onCreateEvent,
  onToggleEventDone,
}) => {
  // Timezone Setting State (МСК default vs Local device timezone)
  const [timezoneMode, setTimezoneMode] = useState<TimezoneMode>(() => getSavedTimezoneMode());

  // Holiday Selection State
  const [holidayMode, setHolidayMode] = useState<HolidayMode>(() => {
    try {
      const saved = localStorage.getItem('notebook_holiday_mode');
      if (saved === 'my_country' || saved === 'current_location' || saved === 'manual_select') {
        return saved;
      }
    } catch {}
    return 'my_country';
  });

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('notebook_holiday_country');
      if (saved) return saved;
    } catch {}
    return 'RU';
  });

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Active View Tab: 'calendar' | 'list' | 'holidays'
  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'holidays'>('calendar');

  // Selected date for day inspector
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Quick event creator form state
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState('12:00');

  // Real-time clock tick for timezone preview
  const [currentTimeTick, setCurrentTimeTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeTick(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Update timezone setting
  const handleTimezoneChange = (mode: TimezoneMode) => {
    setTimezoneMode(mode);
    saveTimezoneMode(mode);
  };

  // Resolve active country code based on mode
  const activeCountryCode = useMemo(() => {
    if (holidayMode === 'my_country') {
      return 'RU';
    }
    if (holidayMode === 'current_location') {
      return detectCountryFromTimezone();
    }
    return selectedCountryCode;
  }, [holidayMode, selectedCountryCode]);

  const activeCountryObj = useMemo(() => {
    return SUPPORTED_COUNTRIES.find((c) => c.code === activeCountryCode) || SUPPORTED_COUNTRIES[0];
  }, [activeCountryCode]);

  const activeHolidays = useMemo(() => {
    return getCountryHolidays(activeCountryCode);
  }, [activeCountryCode]);

  // Save holiday settings
  const handleHolidayModeChange = (mode: HolidayMode) => {
    setHolidayMode(mode);
    try {
      localStorage.setItem('notebook_holiday_mode', mode);
    } catch {}
  };

  const handleSelectCountry = (code: string) => {
    setSelectedCountryCode(code);
    setHolidayMode('manual_select');
    setShowCountryDropdown(false);
    try {
      localStorage.setItem('notebook_holiday_country', code);
      localStorage.setItem('notebook_holiday_mode', 'manual_select');
    } catch {}
  };

  // Timezone label info
  const tzInfo = useMemo(() => {
    return getTimezoneLabel(timezoneMode);
  }, [timezoneMode, currentTimeTick]);

  // Filter only event notes
  const eventNotes = useMemo(() => {
    return notes.filter((n) => n.category === 'event' && !n.isArchived);
  }, [notes]);

  // Events on the currently selected date
  const selectedDateEvents = useMemo(() => {
    return eventNotes.filter((n) => {
      if (n.eventDate === selectedDate) return true;
      if (n.reminderDateTime && n.reminderDateTime.startsWith(selectedDate)) return true;
      return false;
    });
  }, [eventNotes, selectedDate]);

  const selectedDateHoliday = useMemo(() => {
    return findHolidayForDate(selectedDate, activeCountryCode);
  }, [selectedDate, activeCountryCode]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateEvent(newTitle.trim(), newDate, newTime);
    setNewTitle('');
    setShowQuickForm(false);
  };

  const handleOpenAddForSelectedDate = () => {
    setNewDate(selectedDate);
    setShowQuickForm(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28 space-y-4">
      {/* 1. TOP HEADER: TITLE & TIMEZONE & HOLIDAY SETTINGS BAR */}
      <div className="bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-900/10 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-2xl bg-purple-500/15 text-purple-700 dark:text-purple-400">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                Интуитивный календарь & События
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Сетка месяца, загрузка праздников стран, учет часовых поясов и плотность графика
            </p>
          </div>

          <button
            onClick={() => {
              setNewDate(selectedDate);
              setShowQuickForm(!showQuickForm);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/25 transition active:scale-95 shrink-0 self-start sm:self-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showQuickForm ? 'Скрыть форму' : '➕ Новое событие'}</span>
          </button>
        </div>

        {/* 2. TIMEZONE SWITCHER BAR (МСК default vs Local Timezone) */}
        <div className="bg-stone-50 dark:bg-stone-850/80 rounded-2xl p-3 border border-stone-200/80 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <span className="font-bold text-stone-900 dark:text-white block">
                Часовой пояс календаря:
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Текущее время: <b className="font-mono text-purple-700 dark:text-purple-400">{tzInfo.nowStr}</b> ({tzInfo.offsetStr})
              </span>
            </div>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-stone-200/80 dark:bg-stone-800 border border-stone-300/80 dark:border-stone-700 font-semibold self-start md:self-center">
            <button
              onClick={() => handleTimezoneChange('default_msk')}
              className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer whitespace-nowrap ${
                timezoneMode === 'default_msk'
                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                  : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
              }`}
              title="Фиксированное время по Москве (МСК, UTC+3)"
            >
              🇷🇺 МСК (по умолчанию)
            </button>
            <button
              onClick={() => handleTimezoneChange('device_local')}
              className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer whitespace-nowrap ${
                timezoneMode === 'device_local'
                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                  : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
              }`}
              title="Автоматически учитывать смену часового пояса устройства"
            >
              🌐 Местное время устройства
            </button>
          </div>
        </div>

        {/* 3. HOLIDAYS LOADER & COUNTRY SELECTION SWITCHER */}
        <div className="bg-amber-500/10 dark:bg-stone-850/80 rounded-2xl p-3 border border-amber-500/30 dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl select-none">🎉</span>
            <div>
              <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <span>Государственные праздники:</span>
                <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 font-extrabold text-[11px] border border-amber-400/40">
                  {activeCountryObj.flag} {activeCountryObj.name} ({activeHolidays.length})
                </span>
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Официальные нерабочие дни выделяются на календаре и в виджете
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleHolidayModeChange('my_country')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                holidayMode === 'my_country'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
              title="Оставлять праздники своей страны (Россия)"
            >
              <span>🇷🇺</span>
              <span>Моя страна (РФ)</span>
            </button>

            <button
              onClick={() => handleHolidayModeChange('current_location')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                holidayMode === 'current_location'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
              title="Подгружать праздники страны, где сейчас находитесь"
            >
              <span>📍</span>
              <span>Текущая страна</span>
            </button>

            {/* Custom Country Dropdown Picker */}
            <div className="relative">
              <button
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                  holidayMode === 'manual_select'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                <span>🏳️</span>
                <span>Выбрать страну</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showCountryDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-56 max-h-64 overflow-y-auto bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-700 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-stone-400">
                    Выберите страну для праздников:
                  </div>
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleSelectCountry(c.code)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                        activeCountryCode === c.code
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold'
                          : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                      </span>
                      {activeCountryCode === c.code && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK EVENT FORM */}
      {showQuickForm && (
        <form
          onSubmit={handleQuickSubmit}
          className="bg-white dark:bg-stone-900 border border-purple-400/50 dark:border-purple-500/40 rounded-3xl p-5 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-3 transition-colors"
        >
          <div className="flex items-center justify-between pb-2 border-b border-amber-900/10 dark:border-stone-800">
            <span className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-purple-600" />
              <span>Создать событие в тетради</span>
            </span>
            <button
              type="button"
              onClick={() => setShowQuickForm(false)}
              className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1 font-semibold">
              Название события или встречи:
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Встреча команды, вылет, визит к врачу, день рождения..."
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-purple-500 font-medium"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1 font-semibold">
                Дата события:
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1 font-semibold">
                Время:
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-900/10 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setShowQuickForm(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              Сохранить событие в тетрадь
            </button>
          </div>
        </form>
      )}

      {/* VIEW TABS: МЕСЯЦ / СПИСОК / ПРАЗДНИКИ */}
      <div className="flex items-center gap-1.5 border-b border-amber-900/10 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>📅 Календарь на месяц</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
            activeTab === 'list'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>📋 Список событий ({eventNotes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
            activeTab === 'holidays'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          <span>🎉</span>
          <span>Праздники {activeCountryObj.flag}</span>
        </button>
      </div>

      {/* TAB 1: MONTH CALENDAR WIDGET & SELECTED DAY INSPECTOR */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Main Month Widget with Density Workload & Nearest Event */}
          <CalendarMonthWidget
            notes={notes}
            timezoneMode={timezoneMode}
            countryCode={activeCountryCode}
            onOpenNote={onOpenNote}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
          />

          {/* SELECTED DAY INSPECTOR CARD */}
          <div className="bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-amber-900/10 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-400 font-mono font-bold text-xs">
                  {selectedDate.slice(8, 10)}.{selectedDate.slice(5, 7)}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                    {new Date(selectedDate).toLocaleDateString('ru-RU', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h4>
                  {selectedDateHoliday && (
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <span>{selectedDateHoliday.emoji || '🎉'}</span>
                      <span>Праздник: {selectedDateHoliday.name}</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleOpenAddForSelectedDate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить</span>
              </button>
            </div>

            {/* List of events on this day */}
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDateEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => onOpenNote(evt)}
                    className="p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleEventDone(evt);
                        }}
                        className="text-stone-300 hover:text-purple-600 dark:text-stone-600 dark:hover:text-purple-400 shrink-0 cursor-pointer p-0.5"
                      >
                        {evt.isEventDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-500/20" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-stone-300 dark:border-stone-600" />
                        )}
                      </button>

                      <div className="truncate">
                        <span
                          className={`font-bold text-xs block truncate ${
                            evt.isEventDone
                              ? 'line-through text-stone-400 dark:text-stone-500'
                              : 'text-stone-900 dark:text-white'
                          }`}
                        >
                          {evt.title || 'Событие без названия'}
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-purple-600" />
                          <span>{evt.eventTime || '12:00'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-bold text-xs shrink-0 group-hover:translate-x-1 transition">
                      <span className="hidden sm:inline">В тетрадь</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center rounded-2xl bg-stone-50/60 dark:bg-stone-850/40 border border-dashed border-stone-300 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400 space-y-1">
                <p>На этот день нет запланированных встреч и дел.</p>
                <button
                  onClick={handleOpenAddForSelectedDate}
                  className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                >
                  + Запланировать встречу или событие
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FULL EVENTS LIST */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {eventNotes.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-stone-900 rounded-3xl border border-amber-900/10 dark:border-stone-800">
              <CalendarIcon className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <h3 className="font-bold text-base text-stone-900 dark:text-white">Пока нет событий</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mb-4">
                Добавьте важное событие, встречу или мероприятие с датой и временем.
              </p>
              <button
                onClick={() => setShowQuickForm(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                + Добавить первое событие
              </button>
            </div>
          ) : (
            eventNotes.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onOpenNote(evt)}
                className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-800 shadow-sm flex items-center justify-between gap-3 hover:border-purple-400 transition cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleEventDone(evt);
                    }}
                    className="text-stone-400 hover:text-purple-600 shrink-0 cursor-pointer p-0.5"
                  >
                    {evt.isEventDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-500/20" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-stone-300 dark:border-stone-600" />
                    )}
                  </button>

                  <div className="truncate">
                    <h4
                      className={`font-bold text-sm truncate ${
                        evt.isEventDone
                          ? 'line-through text-stone-400 dark:text-stone-500'
                          : 'text-stone-900 dark:text-white'
                      }`}
                    >
                      {evt.title || 'Событие'}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span>📅 {evt.eventDate || 'Без даты'}</span>
                      <span>•</span>
                      <span>⏰ {evt.eventTime || '12:00'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {evt.reminderEnabled && (
                    <span className="p-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: HOLIDAYS LIST FOR SELECTED COUNTRY */}
      {activeTab === 'holidays' && (
        <div className="bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                <span>{activeCountryObj.flag}</span>
                <span>Официальные праздники: {activeCountryObj.name}</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Всего {activeHolidays.length} праздничных дат, учитываемых в календаре
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeHolidays.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-stone-50/80 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-750 flex items-center gap-3"
              >
                <span className="text-2xl select-none">{h.emoji || '🎉'}</span>
                <div className="min-w-0">
                  <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-400 block">
                    {h.date.slice(3, 5)}.{h.date.slice(0, 2)}
                  </span>
                  <span className="font-bold text-xs text-stone-900 dark:text-white block truncate">
                    {h.name}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">
                    {h.isOfficialNonWorking ? 'Официальный выходной день' : 'Памятная дата'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
