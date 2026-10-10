export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  category: 'payment' | 'shopping' | 'general' | 'budget';
  color?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  tags: string[];
  // Calculated cache
  cachedTotal?: number;
  currency?: string;
  shoppingItemsCount?: number;
  completedItemsCount?: number;
}

export interface LineCalculation {
  lineNumber: number;
  rawText: string;
  expression: string | null;
  result: number | null;
  currency: string;
  label: string;
  isTotalLine: boolean;
}

export interface NoteCalculationSummary {
  lines: LineCalculation[];
  grandTotal: number;
  currency: string;
  totalCalculatedLines: number;
  breakdownByCurrency: Record<string, number>;
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
  lastSyncedAt: number | null;
  syncMethod: 'firebase' | 'local';
  roomCode?: string;
  error?: string | null;
}
