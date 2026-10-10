import { Note } from '../types';
import { analyzeNote } from '../utils/mathEngine';
import { extractShoppingItems } from '../utils/shoppingParser';

const STORAGE_KEY = 'notebook_smart_notes_v1';
const SETTINGS_KEY = 'notebook_smart_settings_v1';

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-sample-payments',
    title: '💸 Счета и оплаты за месяц',
    content: `Оплата квартиры и коммунальные:
Аренда: 35000 руб
Электричество: 1850 + 620
Интернет и ТВ: 950 - 10%
Вода по счетчикам: 1400

Подписки и сервисы:
Музыка и Кинопоиск: 399 * 2
Мобильная связь: 650 + 450
Спортзал абонемент: 3200

Итого к оплате:`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    updatedAt: Date.now() - 1000 * 60 * 30,
    category: 'payment',
    color: '#3b82f6',
    isPinned: true,
    tags: ['Финансы', 'Счета', 'Оплаты'],
  },
  {
    id: 'note-sample-groceries',
    title: '🛒 Список покупок в супермаркете',
    content: `Продукты на неделю:
- [ ] Молоко 3.2% 2 л
- [ ] Яйца С0 10 шт
- [ ] Сыр Гауда 300 г
- [ ] Хлеб бородинский 1 шт
- [ ] Кофе зерновой 500 г
- [x] Чай черный 1 пачка
- [ ] Куриное филе 1.2 кг
- [ ] Яблоки голден 1.5 кг
- [ ] Стиральный порошок автомат
- [ ] Бананы 1 кг

Перекус и сладости:
Шоколад темный: 120 * 3
Круассаны к чаю: 85 * 4`,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 10,
    category: 'shopping',
    color: '#10b981',
    isPinned: true,
    tags: ['Покупки', 'Еда', 'Дом'],
  },
  {
    id: 'note-sample-travel',
    title: '🚗 Поездка на выходные (расчет)',
    content: `Расчет бюджета поездки на двоих:
Бензин туда-обратно: 54.5 * 45л
Отель на 2 ночи: 4200 * 2
Завтраки и обеды: 1600 * 3
Экскурсия в заповедник: (800 + 400) * 2
Сувениры и кофе: 1500 - 15%

Скидка по промокоду: -500`,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 5,
    category: 'budget',
    color: '#8b5cf6',
    isPinned: false,
    tags: ['Путешествия', 'Бюджет'],
  },
];

export function enrichNoteMetadata(note: Note): Note {
  const math = analyzeNote(note.content);
  const shopping = extractShoppingItems(note.content);

  return {
    ...note,
    cachedTotal: math.grandTotal,
    currency: math.currency,
    shoppingItemsCount: shopping.length,
    completedItemsCount: shopping.filter((i) => i.isCompleted).length,
  };
}

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const enriched = INITIAL_NOTES.map(enrichNoteMetadata);
      saveNotes(enriched);
      return enriched;
    }
    const parsed: Note[] = JSON.parse(raw);
    return parsed.map(enrichNoteMetadata);
  } catch (e) {
    console.error('Failed to load notes from localStorage', e);
    return INITIAL_NOTES.map(enrichNoteMetadata);
  }
}

export function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to localStorage', e);
  }
}

export interface UserSettings {
  haptics: boolean;
  theme: 'dark' | 'light';
  defaultCurrency: string;
  autoSaveCloud: boolean;
  screenWakeLock: boolean;
  firebaseProjectId?: string;
  firebaseApiKey?: string;
  roomCode?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  haptics: true,
  theme: 'dark',
  defaultCurrency: '₽',
  autoSaveCloud: true,
  screenWakeLock: false,
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
