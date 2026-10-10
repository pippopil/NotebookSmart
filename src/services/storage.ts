import { Note } from '../types';
import { analyzeNote } from '../utils/mathEngine';
import { extractShoppingItems } from '../utils/shoppingParser';

const STORAGE_KEY = 'notebook_smart_notes_v1';
const SETTINGS_KEY = 'notebook_smart_settings_v1';

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-sample-simple',
    title: '📝 Мысли и расчет оплат',
    content: `Заметки на полях тетради:
- Позвонить по поводу аренды
- Проверить показания счетчиков воды

Расчет платежей на этот месяц:
Аренда квартиры: 35000 руб
Электричество + свет: 1850 + 620
Интернет: 950 - 10%
Спортзал: 3200

Итого к оплате:`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    updatedAt: Date.now() - 1000 * 60 * 30,
    category: 'note',
    paperStyle: 'grid',
    color: '#3b82f6',
    isPinned: true,
    tags: ['Заметки', 'Счета'],
  },
  {
    id: 'note-sample-groceries',
    title: '🛒 Список покупок на неделю',
    content: `Список продуктов в тетрадке:
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

К чаю и десерты:
Шоколад темный: 120 * 3
Круассаны: 85 * 4`,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 10,
    category: 'shopping',
    paperStyle: 'grid',
    color: '#10b981',
    isPinned: true,
    tags: ['Покупки', 'Еда', 'Супермаркет'],
  },
  {
    id: 'note-sample-event',
    title: '📅 Событие: Встреча и презентация',
    content: `План мероприятия:
14:00 — Сбор команды и кофе-брейк: 450 * 5
14:30 — Презентация нового релиза NotebookSmart v1.2.0
16:00 — Обсуждение внедрения и ответы на вопросы

Подготовить материалы:
- [ ] Распечатать схемы тетради
- [ ] Проверить подключение проектора
- [x] Отправить ссылку на GitHub репозиторий`,
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    updatedAt: Date.now() - 1000 * 60 * 5,
    category: 'event',
    eventDate: '2026-10-15',
    eventTime: '14:00',
    isEventDone: false,
    paperStyle: 'grid',
    color: '#8b5cf6',
    isPinned: false,
    tags: ['События', 'Встречи', 'Планы'],
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
