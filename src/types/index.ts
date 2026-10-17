export type NoteCategory = 'note' | 'shopping' | 'event' | 'payment' | 'general' | 'budget';

export type PaperStyleType = 'grid' | 'dark-grid' | 'lines' | 'plain' | 'kraft' | 'dots';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  category: NoteCategory;
  color?: string;
  isPinned?: boolean;
  tags: string[];
  // Event specific
  eventDate?: string;
  eventTime?: string;
  isEventDone?: boolean;
  // Notebook Paper Style
  paperStyle?: PaperStyleType;
  // Push Notifications & Reminders (Event & Shopping)
  reminderDateTime?: string; // ISO string e.g. "2026-10-15T14:00"
  reminderEnabled?: boolean;
  reminderTriggered?: boolean;
  // Archive fields
  isArchived?: boolean;
  archivedMonth?: string; // e.g. "2026-09"
  archivedAt?: number;
  // Calculated cache
  cachedTotal?: number;
  cachedIncome?: number;
  cachedExpenses?: number;
  cachedNetBalance?: number;
  cachedPieces?: number;
  currency?: string;
  shoppingItemsCount?: number;
  completedItemsCount?: number;
}

export interface ArchivedBudgetMonth {
  id: string; // e.g. "archive-budget-2026-09"
  year: number;
  month: number; // 1-12
  monthName: string; // e.g. "Сентябрь 2026"
  closedAt: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  currency: string;
  notesCount: number;
  notesSnapshot: Array<{
    id: string;
    title: string;
    content: string;
    income: number;
    expenses: number;
    balance: number;
  }>;
  summaryComment?: string;
}

export interface ArchivedShoppingTrip {
  id: string;
  sourceNoteId?: string;
  title: string;
  completedAt: number;
  monthName: string; // e.g. "Октябрь 2026"
  itemsCount: number;
  items: Array<{
    name: string;
    category?: string;
    estimatedPrice?: number;
    isCompleted: boolean;
  }>;
  totalSpent?: number;
  currency?: string;
}

export interface LineCalculation {
  lineNumber: number;
  rawText: string;
  expression: string | null;
  result: number | null;
  currency: string;
  label: string;
  isTotalLine: boolean;
  type: 'income' | 'expense' | 'total' | 'neutral';
  isPieceCalculation?: boolean;
}

export interface NoteCalculationSummary {
  lines: LineCalculation[];
  grandTotal: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  hasIncomeExpenseSplit: boolean;
  savingsRatePercent: number;
  currency: string;
  totalCalculatedLines: number;
  breakdownByCurrency: Record<string, number>;
  totalPieces?: number;
  hasPiecesCalculation?: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  originalText: string;
  quantity?: number;
  unit?: string;
  category: ShoppingCategory;
  isCompleted: boolean;
  estimatedPriceRub?: number;
  lineIndex?: number;
}

export type ShoppingCategory =
  | 'dairy'       // молочные
  | 'bakery'      // хлеб и выпечка
  | 'meat'        // мясо, рыба
  | 'produce'     // фрукты и овощи
  | 'grocery'     // бакалея, крупы, макароны
  | 'drinks'      // напитки, кофе, чай
  | 'household'   // бытовая химия, дом
  | 'sweets'      // сладости, снеки
  | 'other';

export interface StoreOption {
  id: string;
  name: string;
  type: 'marketplace' | 'delivery' | 'offline_store';
  logoColor: string;
  deliveryTime: string;
  tag: string;
  getSearchUrl: (query: string) => string;
  getMultiItemCartUrl?: (items: string[]) => string;
  description: string;
  freeDeliveryThreshold?: number;
}

export interface NearbyStore {
  id: string;
  name: string;
  chain: string;
  distanceMeters: number;
  distanceText: string;
  walkMinutes: number;
  address: string;
  isOpen: boolean;
  workingHours: string;
  mapYandexUrl: string;
  map2GisUrl: string;
  mapGoogleUrl: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface SyncStatus {
  isConfigured: boolean;
  isConnected: boolean;
  lastSyncedAt: number;
  syncMethod: 'firebase' | 'local';
  roomCode?: string;
}

export interface SecurityConfig {
  isPasscodeSet: boolean;
  passcodeHash?: string;
  passcodeSalt?: string;
  protectFinance: boolean;   // Protect 'calc' (payments/budget) tab and payment notes
  protectShopping: boolean;  // Protect 'shopping' tab and shopping notes
  protectArchive: boolean;   // Protect 'archive' tab
  biometricEnabled: boolean; // Face ID / Fingerprint / WebAuthn
  credentialId?: string;
  autoLockMinutes: number;   // 0 = immediate, 1 = 1m, 5 = 5m, 15 = 15m, -1 = session
}
