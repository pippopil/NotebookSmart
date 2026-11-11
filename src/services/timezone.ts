export type TimezoneMode = 'default_msk' | 'device_local';

const TIMEZONE_PREF_KEY = 'notebook_smart_timezone_mode';

export function getSavedTimezoneMode(): TimezoneMode {
  try {
    const val = localStorage.getItem(TIMEZONE_PREF_KEY);
    if (val === 'device_local' || val === 'default_msk') {
      return val;
    }
  } catch {}
  return 'default_msk';
}

export function saveTimezoneMode(mode: TimezoneMode): void {
  try {
    localStorage.setItem(TIMEZONE_PREF_KEY, mode);
  } catch {}
}

export function getActiveTimezone(mode: TimezoneMode): string {
  if (mode === 'default_msk') {
    return 'Europe/Moscow';
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow';
  } catch {
    return 'Europe/Moscow';
  }
}

export function getTimezoneLabel(mode: TimezoneMode): { label: string; offsetStr: string; nowStr: string } {
  const tz = getActiveTimezone(mode);
  const now = new Date();

  let offsetStr = '+03:00';
  let nowStr = '';

  try {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const timeZonePart = parts.find((p) => p.type === 'timeZoneName');
    if (timeZonePart) {
      offsetStr = timeZonePart.value;
    }
    nowStr = formatter.format(now);
  } catch {
    nowStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  const label = mode === 'default_msk'
    ? 'МСК (по умолчанию, UTC+3)'
    : `Местное время (${tz})`;

  return { label, offsetStr, nowStr };
}

/**
 * Format a timestamp or date into current active timezone string
 */
export function formatInActiveTimezone(
  date: Date | number,
  mode: TimezoneMode,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const tz = getActiveTimezone(mode);
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: tz,
      ...options,
    }).format(d);
  } catch {
    return d.toLocaleString('ru-RU');
  }
}
