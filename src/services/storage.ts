import { Note, ArchivedBudgetMonth, ArchivedShoppingTrip } from '../types';
import { analyzeNote } from '../utils/mathEngine';
import { extractShoppingItems } from '../utils/shoppingParser';

const STORAGE_KEY = 'notebook_smart_notes_v1';
const _SETTINGS_KEY = 'notebook_smart_settings_v1';

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-sample-budget-cashflow',
    title: '💰 Бюджет: Доходы и Расходы',
    content: `Учет финансов в тетрадке:

=== Доходы ===
+ Зарплата: 95 000 руб
+ Премия: 15 000
+ Подработка: 12 500

=== Расходы ===
- Аренда квартиры: 35 000 руб
- Продукты и супермаркет: 18 500
- Коммунальные услуги и интернет: 4 200 + 850
- Бензин и транспорт: 5 000
- Спортзал: 3 500

Остаток (чистая прибыль):`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    updatedAt: Date.now() - 1000 * 60 * 15,
    category: 'payment',
    paperStyle: 'grid',
    color: '#10b981',
    isPinned: true,
    tags: ['Финансы', 'Прибыль', 'Бюджет'],
  },
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
    reminderEnabled: true,
    reminderDateTime: '2026-10-15T18:30',
    tags: ['Покупки', 'Еда', 'Супермаркет'],
  },
  {
    id: 'note-sample-event',
    title: '📅 Событие: Встреча и презентация',
    content: `План мероприятия:
14:00 — Сбор команды и кофе-брейк: 450 * 5
14:30 — Презентация нового релиза NotebookSmart v1.4.0
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
    reminderEnabled: true,
    reminderDateTime: '2026-10-15T13:45',
    tags: ['События', 'Встречи', 'Планы'],
  },
];

export function enrichNoteMetadata(note: Note): Note {
  const math = analyzeNote(note.content);
  const shopping = extractShoppingItems(note.content);

  return {
    ...note,
    cachedTotal: math.grandTotal,
    cachedIncome: math.totalIncome,
    cachedExpenses: math.totalExpenses,
    cachedNetBalance: math.netBalance,
    cachedPieces: math.totalPieces,
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

// ================= ARCHIVE OF PREVIOUS MONTHS & COMPLETED SHOPPING =================
const ARCHIVED_BUDGETS_KEY = 'notebook_smart_archived_budgets_v1';
const ARCHIVED_SHOPPING_KEY = 'notebook_smart_archived_shopping_v1';

export const INITIAL_ARCHIVED_BUDGETS: ArchivedBudgetMonth[] = [
  {
    id: 'archive-budget-2026-09',
    year: 2026,
    month: 9,
    monthName: 'Сентябрь 2026',
    closedAt: new Date(2026, 8, 30, 23, 59).getTime(),
    totalIncome: 132500,
    totalExpenses: 76800,
    netBalance: 55700,
    currency: 'руб',
    notesCount: 2,
    summaryComment: 'Успешный месяц, выполнили цель по накоплениям на 112%!',
    notesSnapshot: [
      {
        id: 'note-snapshot-sep-main',
        title: '💰 Доходы и Расходы Сентябрь 2026',
        content: `=== Доходы ===\n+ Зарплата: 95 000 руб\n+ Премия за проект: 25 000\n+ Подработка и дивиденды: 12 500\n\n=== Расходы ===\n- Аренда жилья: 35 000 руб\n- Продукты питания: 19 200\n- Коммунальные услуги и связь: 4 600\n- Транспорт и ТО: 8 000\n- Кафе и отдых: 10 000\n\nОстаток в итоге: 55 700 руб`,
        income: 132500,
        expenses: 76800,
        balance: 55700,
      },
    ],
  },
  {
    id: 'archive-budget-2026-08',
    year: 2026,
    month: 8,
    monthName: 'Август 2026',
    closedAt: new Date(2026, 7, 31, 23, 59).getTime(),
    totalIncome: 125000,
    totalExpenses: 84300,
    netBalance: 40700,
    currency: 'руб',
    notesCount: 1,
    summaryComment: 'Отпускной месяц: закрыли расходы на билеты и гостиницу.',
    notesSnapshot: [
      {
        id: 'note-snapshot-aug-main',
        title: '💰 Бюджет Август 2026 (Отпуск)',
        content: `=== Доходы ===\n+ Зарплата: 95 000 руб\n+ Отпускные: 30 000\n\n=== Расходы ===\n- Аренда: 35 000 руб\n- Путевка и билеты: 32 000\n- Питание: 14 300\n- Прочие траты: 3 000\n\nОстаток в итоге: 40 700 руб`,
        income: 125000,
        expenses: 84300,
        balance: 40700,
      },
    ],
  },
];

export const INITIAL_ARCHIVED_SHOPPING: ArchivedShoppingTrip[] = [
  {
    id: 'archive-shopping-oct-party',
    sourceNoteId: 'note-old-shopping-1',
    title: '🛒 Закупка к семейному празднику',
    completedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    monthName: 'Октябрь 2026',
    itemsCount: 7,
    totalSpent: 4850,
    currency: 'руб',
    items: [
      { name: 'Торт медовый 1 кг', category: 'sweets', estimatedPrice: 850, isCompleted: true },
      { name: 'Фруктовое ассорти (яблоки, виноград)', category: 'produce', estimatedPrice: 620, isCompleted: true },
      { name: 'Сырная тарелка (Пармезан, Бри)', category: 'dairy', estimatedPrice: 1100, isCompleted: true },
      { name: 'Мясная нарезка', category: 'meat', estimatedPrice: 780, isCompleted: true },
      { name: 'Соки и лимонады 4 шт', category: 'drinks', estimatedPrice: 560, isCompleted: true },
      { name: 'Салфетки праздничные', category: 'household', estimatedPrice: 140, isCompleted: true },
      { name: 'Чай элитный подарочный', category: 'drinks', estimatedPrice: 800, isCompleted: true },
    ],
  },
  {
    id: 'archive-shopping-sep-pantry',
    sourceNoteId: 'note-old-shopping-2',
    title: '🛒 Оптовая закупка бакалеи на осень',
    completedAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    monthName: 'Сентябрь 2026',
    itemsCount: 6,
    totalSpent: 3420,
    currency: 'руб',
    items: [
      { name: 'Рис басмати 3 кг', category: 'grocery', estimatedPrice: 540, isCompleted: true },
      { name: 'Гречневая крупа 4 пачки', category: 'grocery', estimatedPrice: 380, isCompleted: true },
      { name: 'Макароны твердых сортов 5 уп', category: 'grocery', estimatedPrice: 450, isCompleted: true },
      { name: 'Масло оливковое Extra Virgin 1 л', category: 'grocery', estimatedPrice: 950, isCompleted: true },
      { name: 'Мука пшеничная высший сорт 2 кг', category: 'bakery', estimatedPrice: 200, isCompleted: true },
      { name: 'Стиральный гель автомат 3 л', category: 'household', estimatedPrice: 900, isCompleted: true },
    ],
  },
];

export function loadArchivedBudgets(): ArchivedBudgetMonth[] {
  try {
    const raw = localStorage.getItem(ARCHIVED_BUDGETS_KEY);
    if (!raw) {
      saveArchivedBudgets(INITIAL_ARCHIVED_BUDGETS);
      return INITIAL_ARCHIVED_BUDGETS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load archived budgets', e);
    return INITIAL_ARCHIVED_BUDGETS;
  }
}

export function saveArchivedBudgets(budgets: ArchivedBudgetMonth[]): void {
  try {
    localStorage.setItem(ARCHIVED_BUDGETS_KEY, JSON.stringify(budgets));
  } catch (e) {
    console.error('Failed to save archived budgets', e);
  }
}

export function loadArchivedShopping(): ArchivedShoppingTrip[] {
  try {
    const raw = localStorage.getItem(ARCHIVED_SHOPPING_KEY);
    if (!raw) {
      saveArchivedShopping(INITIAL_ARCHIVED_SHOPPING);
      return INITIAL_ARCHIVED_SHOPPING;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load archived shopping', e);
    return INITIAL_ARCHIVED_SHOPPING;
  }
}

export function saveArchivedShopping(trips: ArchivedShoppingTrip[]): void {
  try {
    localStorage.setItem(ARCHIVED_SHOPPING_KEY, JSON.stringify(trips));
  } catch (e) {
    console.error('Failed to save archived shopping', e);
  }
}
