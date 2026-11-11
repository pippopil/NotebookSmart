import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Clock,
  Check,
  X,
  Shield,
  Sparkles,
  Calendar,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  TimezoneMode,
  getTimezoneLabel,
  getDeviceTimezone,
  isLocalDifferentFromMsk,
} from '../services/timezone';
import { ThemeToggle } from './ThemeToggle';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timezoneMode: TimezoneMode;
  onTimezoneModeChange: (mode: TimezoneMode) => void;
  onOpenSecurity?: () => void;
  onOpenChangelog?: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  timezoneMode,
  onTimezoneModeChange,
  onOpenSecurity,
  onOpenChangelog,
}) => {
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const tzInfo = getTimezoneLabel(timezoneMode);
  const deviceTz = getDeviceTimezone();
  const isDiff = isLocalDifferentFromMsk();

  // Moscow current live time
  const mskTimeStr = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());

  // Device local current live time
  const localTimeStr = new Intl.DateTimeFormat('ru-RU', {
    timeZone: deviceTz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg bg-[#fffdfa] dark:bg-stone-900 border border-amber-900/20 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-stone-900 dark:text-stone-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-900/10 dark:border-stone-800 flex items-center justify-between bg-amber-500/5 dark:bg-stone-850/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-purple-500/15 text-purple-700 dark:text-purple-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-stone-900 dark:text-white">
                Настройки приложения
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Часовой пояс, оформление, безопасность и параметры тетради
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
          {/* SECTION 1: TIMEZONE SETTINGS (USER'S EXPLICIT REQUEST) */}
          <div className="bg-stone-50 dark:bg-stone-850/80 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                    Часовой пояс событий и календаря
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Автоматический пересчет времени всех событий в EventsView
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-400 font-mono text-[11px] font-bold border border-purple-400/30">
                {tzInfo.offsetStr}
              </span>
            </div>

            {/* Timezone Switcher Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Moscow Time (Default) */}
              <button
                type="button"
                onClick={() => onTimezoneModeChange('default_msk')}
                className={`p-3 rounded-2xl border text-left transition active:scale-98 cursor-pointer flex flex-col justify-between gap-2 ${
                  timezoneMode === 'default_msk'
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30 shadow-sm'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900 dark:text-white">
                    <span className="text-base">🇷🇺</span>
                    <span>МСК (по умолчанию)</span>
                  </span>
                  {timezoneMode === 'default_msk' && (
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-medium">
                    Московское время (UTC+3)
                  </span>
                  <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-300 block">
                    {mskTimeStr}
                  </span>
                </div>
              </button>

              {/* Option 2: Device Local Time */}
              <button
                type="button"
                onClick={() => onTimezoneModeChange('device_local')}
                className={`p-3 rounded-2xl border text-left transition active:scale-98 cursor-pointer flex flex-col justify-between gap-2 ${
                  timezoneMode === 'device_local'
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30 shadow-sm'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900 dark:text-white">
                    <span className="text-base">🌐</span>
                    <span>Местное время</span>
                  </span>
                  {timezoneMode === 'device_local' && (
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block font-medium truncate">
                    {deviceTz}
                  </span>
                  <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-300 block">
                    {localTimeStr}
                  </span>
                </div>
              </button>
            </div>

            {/* Explanation & Automatic Event Recalculation Badge */}
            <div className="p-2.5 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/20 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Автоматическое применение к событиям:</span>
              </div>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed pl-5">
                {timezoneMode === 'default_msk'
                  ? 'Все события, дедлайны и встречи отображаются по Московскому времени (UTC+3) независимо от региона поездки.'
                  : `Все события автоматически пересчитываются под часовой пояс устройства (${deviceTz}). Время встреч и календарная сетка адаптируются автоматически.`}
              </p>
              {isDiff && timezoneMode === 'device_local' && (
                <div className="pl-5 pt-0.5 text-purple-800 dark:text-purple-300 font-semibold font-mono text-[10px]">
                  Разница с Москвой: {tzInfo.diffFromMskHours > 0 ? `+${tzInfo.diffFromMskHours}` : tzInfo.diffFromMskHours} ч.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: THEME & APPEARANCE */}
          <div className="bg-stone-50 dark:bg-stone-850/80 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                <span>🎨</span>
                <span>Тема оформления</span>
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Переключение между светлой крафтовой тетрадью и ночным режимом
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* SECTION 3: SECURITY & DATA PROTECTION */}
          {onOpenSecurity && (
            <div className="bg-stone-50 dark:bg-stone-850/80 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Безопасность и PIN-код</span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Защита разделов «Финансы», «Покупки» и «Архив» цифровым кодом и биометрией
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSecurity();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
              >
                Настроить
              </button>
            </div>
          )}

          {/* SECTION 4: VERSION & CHANGELOG */}
          {onOpenChangelog && (
            <div className="bg-stone-50 dark:bg-stone-850/80 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>История версий и обновления</span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Что нового в последних версиях NotebookSmart
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChangelog();
                }}
                className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 font-bold text-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                История
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-900/10 dark:border-stone-800 bg-amber-500/5 dark:bg-stone-850/50 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
            Настройки сохраняются автоматически
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
