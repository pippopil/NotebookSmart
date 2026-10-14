import { LineCalculation, NoteCalculationSummary } from '../types';

/**
 * Normalizes numbers with thousands separators and comma decimals:
 * - "3 000" -> "3000"
 * - "3.000" -> "3000" (dot as thousands separator)
 * - "3,000" -> "3000" (comma as thousands separator)
 * - "35.000" -> "35000", "1.000.000" -> "1000000"
 * - "3.000,50" -> "3000.50", "3,000.50" -> "3000.50"
 * - "561,69" -> "561.69", "3,5" -> "3.5"
 */
export function normalizeNumbers(text: string): string {
  // 1. Grouped thousands with dots/commas followed by decimals:
  // "3.000,50" -> "3000.50", "3,000.50" -> "3000.50"
  let s = text.replace(
    /(\d{1,3}(?:[.]\d{3})+),(\d+)/g,
    (_, intPart, dec) => intPart.replace(/[.]/g, '') + '.' + dec
  );
  s = s.replace(
    /(\d{1,3}(?:[,]\d{3})+)[.](\d+)/g,
    (_, intPart, dec) => intPart.replace(/[,]/g, '') + '.' + dec
  );

  // 2. Pure thousands with dots: e.g. "3.000", "35.000", "1.000.000"
  s = s.replace(/\b(\d{1,3}(?:[.]\d{3})+)(?!\d|[.]\d)/g, (_, m) =>
    m.replace(/[.]/g, '')
  );

  // 3. Pure thousands with commas: e.g. "3,000", "35,000", "1,000,000"
  s = s.replace(/\b(\d{1,3}(?:[,]\d{3})+)(?!\d|[,]\d)/g, (_, m) =>
    m.replace(/[,]/g, '')
  );

  // 4. Any remaining comma between digits where it is a decimal: e.g. "561,69" -> "561.69"
  s = s.replace(/(\d+),(\d+)/g, '$1.$2');

  // 5. Thousands separator spaces between digits: "3 000" -> "3000", "35 000" -> "35000"
  s = s.replace(/(?<=\d)[\s\u00A0\u202F\u2009\u200A\u2002\u2003]+(?=\d)/g, '');

  return s;
}

/**
 * Normalizes text line by replacing Russian money multipliers:
 * "3-х тысяч" -> "3000", "3 тыс" -> "3000", "3 тысячи" -> "3000", "3к" -> "3000"
 * "1.5 тыс" -> "1500", "2 млн" -> "2000000"
 */
export function normalizeMultipliers(text: string): string {
  return text
    // 1. Thousands: 3-х тысяч, 3х тысяч, 3-ех тысяч, 3 тысячи, 3 тысяч, 3 тыс., 3 тыс
    .replace(
      /(\d+(?:[.,]\d+)?)\s*(?:[-–—]?(?:х|ех|мя|ем|и)?\s*)?(?:тыс(?:яч[а-я]*)?\.?)(?!\p{L})/giu,
      (_, n) => {
        const val = parseFloat(n.replace(',', '.'));
        return isNaN(val) ? _ : `${val * 1000}`;
      }
    )
    // 2. Short "к" or "k": 3к, 3 к, 3k, 3 k
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:к|k)(?!\p{L})/giu, (_, n) => {
      const val = parseFloat(n.replace(',', '.'));
      return isNaN(val) ? _ : `${val * 1000}`;
    })
    // 3. Millions: 3 млн, 3-х миллионов, 3 млн., 3 миллиона
    .replace(
      /(\d+(?:[.,]\d+)?)\s*(?:[-–—]?(?:х|ех|мя|ем|и)?\s*)?(?:млн\.?|миллион[а-я]*)(?!\p{L})/giu,
      (_, n) => {
        const val = parseFloat(n.replace(',', '.'));
        return isNaN(val) ? _ : `${val * 1000000}`;
      }
    )
    // 4. Billions: 3 млрд, 3 миллиарда
    .replace(
      /(\d+(?:[.,]\d+)?)\s*(?:[-–—]?(?:х|ех|мя|ем|и)?\s*)?(?:млрд\.?|миллиард[а-я]*)(?!\p{L})/giu,
      (_, n) => {
        const val = parseFloat(n.replace(',', '.'));
        return isNaN(val) ? _ : `${val * 1000000000}`;
      }
    );
}

/**
 * Strips currency words and abbreviations from math candidate
 */
export function stripCurrency(text: string): string {
  return text
    .replace(
      /(?:руб(?:лей|ля|\.?)|rub|usd|eur|тенге|бел\.?руб|гривен|грн|\$|€|₽|₸|Br|₴|(?<=\d|\s|^)р\.?(?!\p{L}))/giu,
      ''
    )
    .trim();
}

/**
 * Extracts currency symbol from line
 */
export function detectCurrency(text: string): string {
  if (/(\$|usd|доллар)/i.test(text)) return '$';
  if (/(€|eur|евро)/i.test(text)) return '€';
  if (/(₸|kzt|тенге)/i.test(text)) return '₸';
  if (/(Br|byn|бел\.?руб)/i.test(text)) return 'Br';
  if (/(₴|uah|гривн)/i.test(text)) return '₴';
  return '₽'; // Default Russian Ruble
}

/**
 * Safely evaluates a simple arithmetic expression without using `eval`.
 * Supports +, -, *, /, %, parentheses, percentage modifications, and grouped numbers.
 */
export function safeEvalMath(expressionStr: string): number | null {
  try {
    let expr = expressionStr.trim();
    if (!expr) return null;

    // Normalize multipliers and numbers
    expr = normalizeMultipliers(expr);
    expr = normalizeNumbers(expr);

    // Replace unicode multiplication and division symbols
    expr = expr.replace(/[×xX]/g, '*').replace(/[÷:]/g, '/');

    // Remove any trailing equal sign or question mark
    expr = expr.replace(/[=?]+$/, '').trim();

    // If pure number without operators:
    if (/^-?\d+(?:\.\d+)?$/.test(expr)) {
      const n = parseFloat(expr);
      return isNaN(n) ? null : n;
    }

    // Handle percentage additions/subtractions: e.g. "3000 - 15%" -> "3000 * (1 - 0.15)"
    expr = expr.replace(
      /(\d+(?:\.\d+)?)\s*([+\-])\s*(\d+(?:\.\d+)?)\s*%/g,
      (_, base, op, pct) => {
        const factor = op === '+' ? 1 + parseFloat(pct) / 100 : 1 - parseFloat(pct) / 100;
        return `(${base} * ${factor})`;
      }
    );

    // Handle standalone percentage: e.g. "15% * 3000" -> "(0.15 * 3000)"
    expr = expr.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1 / 100)');

    // Whitelist only safe characters
    if (!/^[\d\s+\-*/%().]+$/.test(expr)) {
      return null;
    }

    // Tokenize
    const tokens: string[] = [];
    let current = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if (/\s/.test(char)) continue;

      if (/[\d.]/.test(char)) {
        current += char;
      } else if (/[+\-*/%()]/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        // Handle unary minus: e.g. "-50" or "(-50)" or "3 * -2"
        if (char === '-') {
          const prev = tokens[tokens.length - 1];
          if (!prev || /[+\-*/%(]/.test(prev)) {
            current = '-';
            continue;
          }
        }
        tokens.push(char);
      } else {
        return null;
      }
    }
    if (current) tokens.push(current);

    if (tokens.length === 0) return null;

    // Shunting-yard algorithm
    const outputQueue: (number | string)[] = [];
    const operatorStack: string[] = [];
    const precedence: Record<string, number> = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
      '%': 2,
    };

    for (const token of tokens) {
      if (/^-?\d+(?:\.\d+)?$/.test(token)) {
        outputQueue.push(parseFloat(token));
      } else if (/[+\-*/%]/.test(token)) {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '(' &&
          precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        operatorStack.push(token);
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '('
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        if (operatorStack.length === 0) return null;
        operatorStack.pop(); // Pop '('
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop()!;
      if (op === '(' || op === ')') return null;
      outputQueue.push(op);
    }

    // Evaluate RPN
    const evalStack: number[] = [];
    for (const token of outputQueue) {
      if (typeof token === 'number') {
        evalStack.push(token);
      } else {
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (a === undefined || b === undefined) return null;

        let res = 0;
        switch (token) {
          case '+':
            res = a + b;
            break;
          case '-':
            res = a - b;
            break;
          case '*':
            res = a * b;
            break;
          case '/':
            if (b === 0) return null;
            res = a / b;
            break;
          case '%':
            res = a % b;
            break;
        }
        evalStack.push(res);
      }
    }

    if (evalStack.length !== 1) return null;
    const finalVal = evalStack[0];
    return isNaN(finalVal) ? null : Math.round(finalVal * 100) / 100;
  } catch {
    return null;
  }
}

// Keywords for Income / Profit
const INCOME_KEYWORDS = [
  'доход',
  'прибыль',
  'приход',
  'зарплат',
  'зп',
  'аванс',
  'преми',
  'бонус',
  'выручк',
  'дивиденд',
  'кэшбэк',
  'кешбэк',
  'поступлен',
  'возврат',
  'получил',
  'заработал',
  'продаж',
  'подработк',
  'гонорар',
  'income',
  'profit',
  'salary',
  'revenue',
  'deposit',
];

// Keywords for Expenses / Spending
const EXPENSE_KEYWORDS = [
  'расход',
  'трат',
  'убыток',
  'покупк',
  'оплат',
  'купил',
  'аренд',
  'счет',
  'счета',
  'жкх',
  'свет',
  'вода',
  'газ',
  'бензин',
  'такси',
  'продукты',
  'аптека',
  'налог',
  'кредит',
  'ипотек',
  'подписк',
  'спортзал',
  'expense',
  'spend',
  'cost',
  'rent',
  'bill',
];

/**
 * Analyzes a single line of note text:
 * Determines if it contains income, expense, total, or neutral calculation.
 */
export function analyzeLine(
  rawText: string,
  lineNumber: number,
  activeSection: 'income' | 'expense' | null = null
): LineCalculation {
  const trimmed = rawText.trim();
  const defaultCurrency = detectCurrency(trimmed);

  if (!trimmed) {
    return {
      lineNumber,
      rawText,
      expression: null,
      result: null,
      currency: defaultCurrency,
      label: '',
      isTotalLine: false,
      type: 'neutral',
    };
  }

  const isTotalLine = /^[-*•]?\s*(?:итого|всего|общая сумма|остаток(?: бюджета)?|баланс|чистая прибыль|сальдо|итог|total|sum|balance|net)/i.test(
    trimmed
  );

  // 1. Normalize Russian multipliers (3-х тысяч, 3 тыс, 3 тысячи, 3к)
  const withMultipliers = normalizeMultipliers(trimmed);

  // 2. Normalize grouped numbers (3.000, 3,000, 3 000 -> 3000, decimals 561,69 -> 561.69)
  const normalized = normalizeNumbers(withMultipliers);

  // Split label from math expression
  let label = '';
  let potentialExpr = '';

  const colonIdx = normalized.indexOf(':');
  const eqIdx = normalized.indexOf('=');

  if (colonIdx !== -1) {
    label = normalized.substring(0, colonIdx).trim();
    potentialExpr = normalized.substring(colonIdx + 1).trim();
  } else if (eqIdx !== -1 && eqIdx > 0 && !/[+\-*/]/.test(normalized.charAt(eqIdx - 1))) {
    label = normalized.substring(0, eqIdx).trim();
    potentialExpr = normalized.substring(eqIdx + 1).trim();
  } else {
    // Check if line has words followed by math
    // e.g. "+ Зарплата 85000" or "- Аренда 35000" or "Кофе 250 * 2"
    const match = normalized.match(
      /^([+\-]?\s*.*?)([\d\s+\-*/%().xX×÷]+(?:руб(?:лей|ля|\.?)|р\.?|rub|\$|€|₽|тенге)?)$/i
    );
    if (match && match[1] && match[2] && /\d/.test(match[2])) {
      label = match[1].trim();
      potentialExpr = match[2].trim();
    } else {
      potentialExpr = normalized;
    }
  }

  // Determine income vs expense classification
  const lowerLabel = (label + ' ' + rawText).toLowerCase();
  let lineType: 'income' | 'expense' | 'total' | 'neutral' = 'neutral';

  if (isTotalLine) {
    lineType = 'total';
  } else {
    const hasPlusPrefix = /^[+]\s*\d/i.test(potentialExpr) || /^[+]\s*/.test(label);
    const hasMinusPrefix = /^[-]\s*\d/i.test(potentialExpr) || /^[-]\s*/.test(label);

    const matchesIncomeWord = INCOME_KEYWORDS.some((kw) => lowerLabel.includes(kw));
    const matchesExpenseWord = EXPENSE_KEYWORDS.some((kw) => lowerLabel.includes(kw));

    if (hasPlusPrefix || matchesIncomeWord || activeSection === 'income') {
      lineType = 'income';
    } else if (hasMinusPrefix || matchesExpenseWord || activeSection === 'expense') {
      lineType = 'expense';
    } else {
      // Default fallback if arithmetic result is present
      lineType = 'expense';
    }
  }

  // Strip currency words and symbols
  let cleanExpr = stripCurrency(potentialExpr);

  // If cleanExpr starts with explicit + or - sign, keep or sanitize for evaluation
  if (cleanExpr.startsWith('+')) {
    cleanExpr = cleanExpr.substring(1).trim();
  }

  // Test if it has digits
  if (/\d/.test(cleanExpr)) {
    const result = safeEvalMath(cleanExpr);
    if (result !== null && !isNaN(result)) {
      return {
        lineNumber,
        rawText,
        expression: cleanExpr,
        result: Math.abs(result),
        currency: defaultCurrency,
        label,
        isTotalLine,
        type: lineType,
      };
    }
  }

  return {
    lineNumber,
    rawText,
    expression: null,
    result: null,
    currency: defaultCurrency,
    label,
    isTotalLine,
    type: isTotalLine ? 'total' : 'neutral',
  };
}

/**
 * Analyzes whole note text line-by-line and calculates:
 * - Line calculations
 * - Income (Прибыль / Доходы)
 * - Expenses (Расходы / Траты)
 * - Net Balance (Остаток / Прибыль - Расходы)
 * - Currency breakdown and Grand Total
 */
export function analyzeNote(content: string): NoteCalculationSummary {
  const rawLines = content.split('\n');
  const lines: LineCalculation[] = [];
  const breakdownByCurrency: Record<string, number> = {};
  let totalCalculatedLines = 0;
  let primaryCurrency = '₽';

  let totalIncome = 0;
  let totalExpenses = 0;
  let hasExplicitIncome = false;
  let activeSection: 'income' | 'expense' | null = null;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const trimmedLower = rawLine.trim().toLowerCase();

    // Section header detection (e.g. "=== Доходы ===", "Доходы:", "=== Расходы ===", "Траты:")
    if (
      /^(?:#+\s*|[-=*~]+\s*)?(?:доход[ыа]?|прибыл[ьи]|поступлени[яе]|приход)\s*[:—=\-]*$/i.test(
        trimmedLower
      )
    ) {
      activeSection = 'income';
      hasExplicitIncome = true;
    } else if (
      /^(?:#+\s*|[-=*~]+\s*)?(?:расход[ыа]?|трат[ыа]|платеж[ией]*|оплат[ыа]|счета)\s*[:—=\-]*$/i.test(
        trimmedLower
      )
    ) {
      activeSection = 'expense';
    } else if (
      /^(?:#+\s*|[-=*~]+\s*)?(?:итого|остаток|баланс|чистая прибыль)\s*[:—=\-]*$/i.test(
        trimmedLower
      )
    ) {
      activeSection = null;
    }

    const parsed = analyzeLine(rawLine, idx + 1, activeSection);

    if (parsed.type === 'income' && parsed.result !== null && !parsed.isTotalLine) {
      hasExplicitIncome = true;
      totalIncome += parsed.result;
      totalCalculatedLines++;
      primaryCurrency = parsed.currency;
    } else if (parsed.type === 'expense' && parsed.result !== null && !parsed.isTotalLine) {
      totalExpenses += parsed.result;
      totalCalculatedLines++;
      primaryCurrency = parsed.currency;
    }

    lines.push(parsed);
  }

  // Net Balance: От прибыли вычитаем расходы
  // If income was explicitly specified, balance is income - expenses
  // If no income was recorded at all, expenses represent the total expenditure.
  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;

  const hasIncomeExpenseSplit = hasExplicitIncome && totalIncome > 0;
  const netBalance = hasIncomeExpenseSplit
    ? Math.round((totalIncome - totalExpenses) * 100) / 100
    : Math.round(totalExpenses * 100) / 100;

  const savingsRatePercent =
    totalIncome > 0
      ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)))
      : 0;

  // Second pass: resolve total and balance lines
  for (const line of lines) {
    if (line.isTotalLine) {
      const lower = line.rawText.toLowerCase();
      if (lower.includes('доход') || lower.includes('прибыл')) {
        line.result = totalIncome;
      } else if (lower.includes('расход') || lower.includes('трат')) {
        line.result = totalExpenses;
      } else if (lower.includes('остаток') || lower.includes('баланс') || lower.includes('чистая')) {
        line.result = hasIncomeExpenseSplit ? netBalance : totalExpenses;
      } else {
        // Generic "Итого:"
        line.result = hasIncomeExpenseSplit ? netBalance : totalExpenses;
      }
      line.currency = primaryCurrency;
    }
  }

  const grandTotal = hasIncomeExpenseSplit ? netBalance : totalExpenses;
  breakdownByCurrency[primaryCurrency] = grandTotal;

  return {
    lines,
    grandTotal,
    totalIncome,
    totalExpenses,
    netBalance,
    hasIncomeExpenseSplit,
    savingsRatePercent,
    currency: primaryCurrency,
    totalCalculatedLines,
    breakdownByCurrency,
  };
}

/**
 * Format currency with thousands spaces
 * e.g. 35000 -> "35 000 ₽", 3000 -> "3 000 ₽"
 */
export function formatMoney(amount: number, currency = '₽'): string {
  const rounded = Math.round(amount * 100) / 100;
  const parts = Math.abs(rounded).toFixed(rounded % 1 === 0 ? 0 : 2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formattedNum = (rounded < 0 ? '− ' : '') + parts.join('.');

  if (currency === '$') return `${rounded < 0 ? '−$' : '$'}${parts.join('.')}`;
  if (currency === '€') return `${rounded < 0 ? '−€' : '€'}${parts.join('.')}`;
  return `${formattedNum} ${currency}`;
}
