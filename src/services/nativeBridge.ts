import { Note } from '../types';
import { extractShoppingItems } from '../utils/shoppingParser';

// Type definition for Android WebView Javascript Interface
declare global {
  interface Window {
    AndroidNative?: {
      isNativeAndroid: () => boolean;
      getNativeVersion: () => string;
      triggerHaptic: (type: number) => void;
      updateWidgetData: (json: string) => boolean;
      scheduleReminder: (
        id: string,
        title: string,
        body: string,
        triggerAtMillis: number,
        category: string
      ) => boolean;
      cancelReminder: (id: string) => boolean;
      shareText: (title: string, text: string) => void;
      isNotificationsEnabled: () => boolean;
    };
  }
}

/**
 * Checks if running inside native Android APK with Enhanced Hybrid Bridge active
 */
export function isAndroidNativeApp(): boolean {
  return typeof window !== 'undefined' && !!window.AndroidNative && typeof window.AndroidNative.isNativeAndroid === 'function';
}

/**
 * Returns native bridge information
 */
export function getNativeAppInfo(): { isNative: boolean; version: string; platform: string } {
  const isNative = isAndroidNativeApp();
  const version = isNative && window.AndroidNative ? window.AndroidNative.getNativeVersion() : 'Web / PWA';
  return {
    isNative,
    version,
    platform: isNative ? 'Android Native (Enhanced Hybrid)' : 'Web Platform / PWA',
  };
}

/**
 * Tactile haptic feedback: Native Android vibrator when available, with browser vibrate fallback
 */
export function nativeHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light'): void {
  if (typeof window === 'undefined') return;

  if (window.AndroidNative && typeof window.AndroidNative.triggerHaptic === 'function') {
    const codeMap = {
      light: 1,
      medium: 2,
      heavy: 3,
      success: 4,
      warning: 5,
    };
    window.AndroidNative.triggerHaptic(codeMap[style] || 1);
    return;
  }

  // Fallback to HTML5 vibration API in web browsers
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    switch (style) {
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'heavy':
        navigator.vibrate(45);
        break;
      case 'success':
        navigator.vibrate([15, 30, 25]);
        break;
      case 'warning':
        navigator.vibrate([35, 40, 35]);
        break;
    }
  }
}

export interface WidgetPayload {
  badge: string;
  summary: string;
  items: string[];
  remaining?: string;
}

/**
 * Syncs data to Android Home Screen Widget
 */
export function syncNativeWidget(data: WidgetPayload): boolean {
  if (typeof window === 'undefined') return false;
  if (window.AndroidNative && typeof window.AndroidNative.updateWidgetData === 'function') {
    return window.AndroidNative.updateWidgetData(JSON.stringify(data));
  }
  return false;
}

/**
 * Helper to automatically format notes and update Android Home Screen widget
 */
export function syncWidgetFromNotes(notes: Note[]): void {
  if (!isAndroidNativeApp()) return;

  // Find active shopping notes
  const shoppingNotes = notes.filter((n) => !n.isArchived && (n.category === 'shopping' || n.shoppingItemsCount));
  
  let uncheckedItems: string[] = [];
  let totalPending = 0;

  for (const sn of shoppingNotes) {
    const items = extractShoppingItems(sn.content);
    for (const item of items) {
      if (!item.isCompleted) {
        totalPending++;
        if (uncheckedItems.length < 3) {
          uncheckedItems.push(item.name);
        }
      }
    }
  }

  if (uncheckedItems.length > 0) {
    const remainingCount = totalPending - uncheckedItems.length;
    syncNativeWidget({
      badge: '🛒 Список покупок',
      summary: `К покупке: ${totalPending} товаров`,
      items: uncheckedItems,
      remaining: remainingCount > 0 ? `+ еще ${remainingCount} товаров в списке...` : '✓ Все актуальные товары показаны',
    });
  } else {
    // If shopping is done, show budget or active notes summary
    const budgetNotes = notes.filter((n) => !n.isArchived && n.cachedTotal);
    const totalExpenses = budgetNotes.reduce((acc, n) => acc + (n.cachedTotal || 0), 0);

    syncNativeWidget({
      badge: '📓 NotebookSmart',
      summary: totalExpenses > 0 ? `Расходы по счетам: ${totalExpenses.toLocaleString('ru-RU')} ₽` : 'Все дела и покупки выполнены!',
      items: ['Откройте блокнот для новых записей'],
      remaining: 'Нажмите для перехода в тетрадь →',
    });
  }
}

/**
 * Schedules exact background alarm via Android AlarmManager
 */
export function scheduleNativeAlarm(
  id: string,
  title: string,
  body: string,
  triggerAtMillis: number,
  category: string = 'note'
): boolean {
  if (typeof window === 'undefined') return false;
  if (window.AndroidNative && typeof window.AndroidNative.scheduleReminder === 'function') {
    return window.AndroidNative.scheduleReminder(id, title, body, triggerAtMillis, category);
  }
  return false;
}

/**
 * Cancels exact background alarm via Android AlarmManager
 */
export function cancelNativeAlarm(id: string): boolean {
  if (typeof window === 'undefined') return false;
  if (window.AndroidNative && typeof window.AndroidNative.cancelReminder === 'function') {
    return window.AndroidNative.cancelReminder(id);
  }
  return false;
}

/**
 * Native Android share sheet or Web Share API
 */
export function nativeShareText(title: string, text: string): boolean {
  if (typeof window === 'undefined') return false;

  if (window.AndroidNative && typeof window.AndroidNative.shareText === 'function') {
    window.AndroidNative.shareText(title, text);
    return true;
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ title, text }).catch(() => {});
    return true;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    return false;
  }

  return false;
}
