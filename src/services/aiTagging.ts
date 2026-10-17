/**
 * AI-powered Auto-tagging Service for NotebookSmart
 * Analyzes note title, content, and category using server-side Gemini 3.8 Flash,
 * with a high-fidelity local heuristic classifier fallback for instant/offline response.
 */

export interface AutoTagResult {
  tags: string[];
  isAiGenerated: boolean;
  source: 'gemini' | 'heuristic';
}

/**
 * Standard popular quick-tag suggestions for everyday organization
 */
export const POPULAR_TAGS = [
  '#work',
  '#personal',
  '#urgent',
  '#shopping',
  '#finances',
  '#health',
  '#home',
  '#study',
  '#travel',
  '#ideas',
];

/**
 * Local heuristic tag generator: analyzes text for high-confidence keywords.
 * Works completely offline or when Gemini API is unreachable.
 */
export function extractSmartTagsLocally(
  title: string = '',
  content: string = '',
  category: string = 'note'
): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const tags = new Set<string>();

  // 1. Urgency detection
  if (
    /срочн|важн|горит|дедлайн|asap|urgent|быстр|скорее|сегодня|до конца|не забыть|priorit/.test(text)
  ) {
    tags.add('#urgent');
  }

  // 2. Work / Career / Business detection
  if (
    /работ|проект|созвон|отчет|митинг|клиент|договор|шеф|коллег|work|job|задач|task|бизнес|meeting|звонок|презентац|руковод|контракт/.test(
      text
    )
  ) {
    tags.add('#work');
  }

  // 3. Personal / Home / Family detection
  if (
    /личн|семь|дом|ребенок|дет|квартир|мама|пап|жен|муж|уборк|быт|personal|home|отдых|семья|ремонт/.test(
      text
    )
  ) {
    tags.add('#personal');
  }

  // 4. Shopping detection
  if (
    category === 'shopping' ||
    /куп|магазин|продукт|молок|хлеб|список|озон|ozon|вайлдберриз|wb|вкусвилл|доставк|shopping|заказ|чек|рынок|супермаркет/.test(
      text
    )
  ) {
    tags.add('#shopping');
  }

  // 5. Finances / Budget detection
  if (
    category === 'payment' ||
    /руб|\$|€|зарплат|расход|доход|оплат|деньг|бюджет|перевод|счет|карт|нал|finance|деньги|налог|аренд|коммуналк|баланс/.test(
      text
    )
  ) {
    tags.add('#finances');
  }

  // 6. Health & Medical detection
  if (
    /врач|доктор|аптек|таблет|лекарств|анализ|спорт|тренировк|здоров|больниц|поликлиник|health|витамин|рецепт/.test(
      text
    )
  ) {
    tags.add('#health');
  }

  // 7. Travel & Events detection
  if (
    category === 'event' ||
    /билет|поезд|самолет|отель|отпуск|поездк|тур|рейс|гостиниц|travel|путешеств|вылет|аэропорт/.test(
      text
    )
  ) {
    tags.add('#travel');
  }

  // 8. Study & Reading detection
  if (
    /учеб|лекци|книг|экзамен|курс|домашк|конспект|study|read|стать|вебинар|урок/.test(
      text
    )
  ) {
    tags.add('#study');
  }

  // 9. Creative Ideas detection
  if (/иде|мысл|план|проект|задумк|concept|idea|вдохновен/.test(text)) {
    tags.add('#ideas');
  }

  // If no specific tags matched, add default based on category
  if (tags.size === 0) {
    if (category === 'shopping') tags.add('#shopping');
    else if (category === 'payment') tags.add('#finances');
    else if (category === 'event') tags.add('#personal');
    else tags.add('#personal');
  }

  return Array.from(tags).slice(0, 4);
}

/**
 * Normalizes a tag string by prefixing with '#' and cleaning characters
 */
export function normalizeTag(tag: string): string {
  let cleaned = tag.trim().toLowerCase().replace(/^[#@]+/, '');
  cleaned = cleaned.replace(/\s+/g, '-').replace(/[^a-z0-9а-яё_-]/gi, '');
  return cleaned ? `#${cleaned}` : '';
}

/**
 * Generates tags using server-side Gemini 3.8 Flash with graceful fallback to local heuristics.
 */
export async function generateAutoTags(
  title: string,
  content: string,
  category: string = 'note'
): Promise<AutoTagResult> {
  const combined = `${title}\n${content}`.trim();

  // If content is empty or super short, return local hints
  if (combined.length < 3) {
    return {
      tags: extractSmartTagsLocally(title, content, category),
      isAiGenerated: false,
      source: 'heuristic',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5s timeout

    const response = await fetch('/api/auto-tag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        category,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        const formatted = data.tags
          .map((t: string) => normalizeTag(t))
          .filter((t: string) => t.length > 1);

        if (formatted.length > 0) {
          return {
            tags: formatted,
            isAiGenerated: true,
            source: 'gemini',
          };
        }
      }
    }
  } catch (err) {
    console.info('Auto-tag server request failed, using smart local rules:', err);
  }

  // Fallback to high quality local heuristics
  return {
    tags: extractSmartTagsLocally(title, content, category),
    isAiGenerated: false,
    source: 'heuristic',
  };
}
