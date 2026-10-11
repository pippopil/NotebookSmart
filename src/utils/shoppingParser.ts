import { ShoppingCategory, ShoppingItem, StoreOption } from '../types';

// Grocery dictionaries for categorization & price estimation
const CATEGORY_PATTERNS: Record<ShoppingCategory, RegExp> = {
  dairy: /(молок|кефир|творог|сыр|сметан|йогурт|масло сливочн|ряженк|сливк|брынз|маскарпоне|пармезан|моцарелл)/i,
  bakery: /(хлеб|батон|булочк|лаваш|багет|круассан|тост|лепешк|сухар|булка)/i,
  meat: /(мяс|говядин|свинин|куриц|индейк|фарш|колбас|сосиск|ветчин|рыб|лосос|семг|форел|креветк|бекон|стейк|грудк|филе)/i,
  produce: /(яблок|банан|апельсин|мандарин|помидор|томат|огурц|картоф|морков|лук|чеснок|зелен|салат|авокадо|лимон|ягод|клубник|виноград|капуст|перец|кабачок|баклажан)/i,
  grocery: /(макарон|спагетти|рис|гречк|овсянк|круп|мук|сахар|соль|масло растительн|масло подсолнечн|масло оливков|соус|кетчуп|майонез|консерв|тушенк|горошек|кукуруз)/i,
  drinks: /(вод[аы]|сок|морс|чай|кофе|квас|лимонад|компот|энергетик|кола|газировк|молотый кофе|зерновой кофе)/i,
  sweets: /(шоколад|конфет|печень|торт|пирожн|вафл|мармелад|зефир|халв|морожен|чипс|снек|орех|сухофрукт)/i,
  household: /(мыл|шампун|гель для душ|порошок|паст[аы] зубн|бумага туалетн|салфетк|губк|пакет|средство для мытья|белизн|кондиционер для белья)/i,
  other: /.*/,
};

// Estimated benchmark average prices (in RUB)
const CATEGORY_AVG_PRICES: Record<ShoppingCategory, number> = {
  dairy: 130,
  bakery: 65,
  meat: 380,
  produce: 140,
  grocery: 110,
  drinks: 95,
  sweets: 150,
  household: 210,
  other: 150,
};

export const CATEGORY_META: Record<ShoppingCategory, { label: string; icon: string }> = {
  dairy: { label: 'Молочное и сыр', icon: '🥛' },
  bakery: { label: 'Хлеб и выпечка', icon: '🍞' },
  meat: { label: 'Мясо и рыба', icon: '🥩' },
  produce: { label: 'Овощи и фрукты', icon: '🍎' },
  grocery: { label: 'Бакалея и крупы', icon: '🌾' },
  drinks: { label: 'Напитки, чай, кофе', icon: '🧃' },
  sweets: { label: 'Сладости и снеки', icon: '🍫' },
  household: { label: 'Бытовая химия и дом', icon: '🧼' },
  other: { label: 'Другие товары', icon: '🛒' },
};

/**
 * Returns direct product search URL for any supported store
 */
export function getItemStoreUrl(storeId: string, itemName: string): string {
  const q = encodeURIComponent(itemName);
  switch (storeId) {
    case 'wb':
      return `https://www.wildberries.ru/catalog/0/search.aspx?search=${q}`;
    case 'ozon':
      return `https://www.ozon.ru/search/?text=${q}`;
    case 'yandex_market':
      return `https://market.yandex.ru/search?text=${q}`;
    case 'megamarket':
      return `https://megamarket.ru/catalog/?q=${q}`;
    case 'kuper':
      return `https://kuper.ru/search?q=${q}`;
    case 'samokat':
      return `https://samokat.ru/search?text=${q}`;
    case 'yandex_lavka':
      return `https://lavka.yandex.ru/search?text=${q}`;
    case 'vkusvill':
      return `https://vkusvill.ru/search/?q=${q}`;
    case 'pyaterochka':
      return `https://5ka.ru/search?q=${q}`;
    case 'vprok':
      return `https://www.vprok.ru/search?text=${q}`;
    case 'magnit':
      return `https://magnit.ru/search/?q=${q}`;
    default:
      return `https://market.yandex.ru/search?text=${q}`;
  }
}

export const STORE_OPTIONS: StoreOption[] = [
  // Маркетплейсы
  {
    id: 'wb',
    name: 'Wildberries',
    type: 'marketplace',
    logoColor: '#cb11ab',
    deliveryTime: '1–2 дня в ПВЗ',
    tag: 'Маркетплейс #1',
    description: 'Миллионы товаров, бесплатная доставка в пункт выдачи',
    getSearchUrl: (q: string) => `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(q)}`,
    getMultiItemCartUrl: (items: string[]) =>
      `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(items.slice(0, 4).join(' '))}`,
  },
  {
    id: 'ozon',
    name: 'Ozon Fresh / Ozon',
    type: 'marketplace',
    logoColor: '#005bff',
    deliveryTime: 'От 1 часа (Fresh) / 1 день',
    tag: 'Маркетплейс & Fresh',
    description: 'Ozon Express и Ozon Fresh — заказ продуктов с быстрой курьерской доставкой',
    getSearchUrl: (q: string) => `https://www.ozon.ru/search/?text=${encodeURIComponent(q)}`,
    getMultiItemCartUrl: (items: string[]) =>
      `https://www.ozon.ru/search/?text=${encodeURIComponent(items.slice(0, 4).join(' '))}`,
  },
  {
    id: 'yandex_market',
    name: 'Яндекс Маркет',
    type: 'marketplace',
    logoColor: '#fc3f1d',
    deliveryTime: 'От 1–2 часов или завтра',
    tag: 'Сплит & Баллы Плюс',
    description: 'Оплата баллами Плюса, сплит и быстрая доставка продуктов',
    getSearchUrl: (q: string) => `https://market.yandex.ru/search?text=${encodeURIComponent(q)}`,
    getMultiItemCartUrl: (items: string[]) =>
      `https://market.yandex.ru/search?text=${encodeURIComponent(items.slice(0, 4).join(' '))}`,
  },
  {
    id: 'megamarket',
    name: 'Мегамаркет',
    type: 'marketplace',
    logoColor: '#7000ff',
    deliveryTime: 'От 1 часа (Самокат/Сбер) до 2 дней',
    tag: 'Бонусы Спасибо',
    description: 'Скидки до 99% бонусами СберСпасибо',
    getSearchUrl: (q: string) => `https://megamarket.ru/catalog/?q=${encodeURIComponent(q)}`,
  },

  // Экспресс-доставка за 15-30 минут
  {
    id: 'kuper',
    name: 'Купер (СберМаркет)',
    type: 'delivery',
    logoColor: '#00b341',
    deliveryTime: '20–45 минут',
    tag: 'Metro, Лента, Ашан, Магнит',
    description: 'Доставка из любимых гипермаркетов и ресторанов по лучшим ценам',
    getSearchUrl: (q: string) => `https://kuper.ru/search?q=${encodeURIComponent(q)}`,
    getMultiItemCartUrl: (items: string[]) =>
      `https://kuper.ru/search?q=${encodeURIComponent(items.slice(0, 3).join(' '))}`,
  },
  {
    id: 'samokat',
    name: 'Самокат',
    type: 'delivery',
    logoColor: '#ff2d55',
    deliveryTime: '15–30 минут',
    tag: 'Быстро от 15 мин',
    description: 'Даркстор рядом с домом, свежие продукты и собственная марка',
    getSearchUrl: (q: string) => `https://samokat.ru/search?text=${encodeURIComponent(q)}`,
  },
  {
    id: 'yandex_lavka',
    name: 'Яндекс Лавка',
    type: 'delivery',
    logoColor: '#2b90d9',
    deliveryTime: '15–30 минут',
    tag: 'Готовая еда и продукты',
    description: 'Ультра-быстрая доставка прямо до двери',
    getSearchUrl: (q: string) => `https://lavka.yandex.ru/search?text=${encodeURIComponent(q)}`,
  },
  {
    id: 'vkusvill',
    name: 'ВкусВилл Доставка',
    type: 'delivery',
    logoColor: '#009a44',
    deliveryTime: 'Бесплатно от 1 часа',
    tag: 'Натуральные продукты',
    description: 'Бесплатная доставка без минимальной суммы заказа',
    getSearchUrl: (q: string) => `https://vkusvill.ru/search/?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'pyaterochka',
    name: 'Пятёрочка Доставка',
    type: 'delivery',
    logoColor: '#e31b23',
    deliveryTime: '30–45 минут',
    tag: 'Выгодные цены',
    description: 'Цены как в магазине у дома, постоянные скидки и акции',
    getSearchUrl: (q: string) => `https://5ka.ru/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'vprok',
    name: 'Перекрёсток Впрок',
    type: 'delivery',
    logoColor: '#005b41',
    deliveryTime: 'В удобный интервал',
    tag: 'Широкий ассортимент',
    description: 'Большой выбор товаров от надежного супермаркета',
    getSearchUrl: (q: string) => `https://www.vprok.ru/search?text=${encodeURIComponent(q)}`,
  },
];

/**
 * Extracts shopping items from raw note text
 */
export function extractShoppingItems(content: string): ShoppingItem[] {
  const lines = content.split('\n');
  const items: ShoppingItem[] = [];
  let currentId = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line is a checklist item e.g. "- [ ] молоко" or "- [x] сыр"
    const checkboxMatch = trimmed.match(/^[-*•]?\s*\[([ xX])\]\s*(.*)$/);
    if (checkboxMatch) {
      const isCompleted = checkboxMatch[1].toLowerCase() === 'x';
      const itemText = checkboxMatch[2].trim();
      if (itemText) {
        items.push(parseShoppingItemString(itemText, isCompleted, `item-${currentId++}`));
      }
      continue;
    }

    // Check if line is a bullet item e.g. "* молоко 2л" or "- хлеб"
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      const itemText = bulletMatch[1].trim();
      // If it looks like a grocery/item rather than general text
      if (itemText && isLikelyShoppingText(itemText)) {
        items.push(parseShoppingItemString(itemText, false, `item-${currentId++}`));
        continue;
      }
    }

    // Check comma-separated items if line starts with keywords like "купить:", "список покупок:", "продукты:"
    const headerPrefix = trimmed.match(/^(купить|покупки|список покупок|продукты|в магазине|shopping|grocery)\s*[:—\-]\s*(.*)$/i);
    if (headerPrefix && headerPrefix[2]) {
      const rawList = headerPrefix[2].split(/[,;]/);
      for (const raw of rawList) {
        const cleaned = raw.trim();
        if (cleaned) {
          items.push(parseShoppingItemString(cleaned, false, `item-${currentId++}`));
        }
      }
      continue;
    }

    // If whole line matches known grocery patterns without bullets
    if (isLikelyShoppingText(trimmed)) {
      items.push(parseShoppingItemString(trimmed, false, `item-${currentId++}`));
    }
  }

  return items;
}

/**
 * Helper to classify item string into parsed data
 */
export function parseShoppingItemString(rawText: string, isCompleted: boolean, id: string): ShoppingItem {
  // Extract quantity and unit: e.g. "Молоко 3.2% 2 л", "Яйца 10 шт", "Сыр 500 г", "Кофе 1 пачка"
  let name = rawText;
  let quantity: number | undefined;
  let unit: string | undefined;

  const qtyMatch = rawText.match(/(\d+(?:[.,]\d+)?)\s*(кг|г|гр|литр(?:а|ов)?|л|мл|шт|штук|упаковк[аи]|пачк[аи]|бут|бан(?:ка|ки)?)\b/i);
  if (qtyMatch) {
    quantity = parseFloat(qtyMatch[1].replace(',', '.'));
    unit = qtyMatch[2];
    name = rawText.replace(qtyMatch[0], '').trim();
  }

  // Detect category
  let category: ShoppingCategory = 'other';
  for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS) as [ShoppingCategory, RegExp][]) {
    if (cat === 'other') continue;
    if (pattern.test(rawText)) {
      category = cat;
      break;
    }
  }

  const basePrice = CATEGORY_AVG_PRICES[category] || 150;
  const estimatedPriceRub = quantity && quantity > 0 && quantity < 20 ? Math.round(basePrice * quantity) : basePrice;

  return {
    id,
    name: name || rawText,
    originalText: rawText,
    quantity,
    unit,
    category,
    isCompleted,
    estimatedPriceRub,
  };
}

/**
 * Detects if a text string contains recognizable groceries or shopping items
 */
export function isLikelyShoppingText(text: string): boolean {
  if (text.length > 120) return false; // Long paragraphs are probably not shopping items
  // Check against any grocery category pattern
  for (const [cat, regex] of Object.entries(CATEGORY_PATTERNS) as [ShoppingCategory, RegExp][]) {
    if (cat !== 'other' && regex.test(text)) return true;
  }
  // Check common unit patterns
  if (/\b\d+\s*(?:кг|г|гр|л|мл|шт|пачк)/i.test(text)) return true;
  return false;
}

/**
 * Generate quick deep link URLs for maps (offline in-store shopping)
 */
export function getMapSearchUrls(chainOrQuery: string) {
  const encoded = encodeURIComponent(chainOrQuery);
  return {
    yandex: `https://yandex.ru/maps/?text=${encoded}`,
    gis: `https://2gis.ru/search/${encoded}`,
    google: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  };
}

/**
 * Create shareable text summary of shopping list for Telegram / WhatsApp / SMS
 */
export function formatShoppingListForSharing(items: ShoppingItem[], noteTitle: string): string {
  if (items.length === 0) return '';
  const remaining = items.filter((i) => !i.isCompleted);
  const done = items.filter((i) => i.isCompleted);

  let text = `🛒 Список покупок: ${noteTitle || 'Без названия'}\n\n`;

  if (remaining.length > 0) {
    text += `Нужно купить (${remaining.length}):\n`;
    remaining.forEach((item, idx) => {
      text += `${idx + 1}. [ ] ${item.name}${item.quantity ? ` — ${item.quantity} ${item.unit || 'шт'}` : ''}\n`;
    });
  }

  if (done.length > 0) {
    text += `\nУже куплено (${done.length}):\n`;
    done.forEach((item) => {
      text += `✓ ${item.name}\n`;
    });
  }

  const estSum = items.reduce((sum, item) => sum + (item.estimatedPriceRub || 0), 0);
  text += `\nОриентировочная сумма: ~${estSum} ₽\n`;
  text += `Открыто в NotebookSmart: https://github.com/pippopil/NotebookSmart`;

  return text;
}
