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
  // Where dot is followed by groups of 3 digits without further digits/decimals
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

    // Handle percentage discounts or additions like: "5000 - 20%" -> "5000 * (1 - 0.20)"
    expr = expr.replace(
      /(\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)\s*%/g,
      (_, base, op, pct) => {
        const b = parseFloat(base);
        const p = parseFloat(pct);
        const delta = (b * p) / 100;
        return op === '+' ? `${b + delta}` : `${b - delta}`;
      }
    );

    // Standalone percentage: "20%" -> "0.2"
    expr = expr.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1 / 100)');

    // Tokenize
    const tokens: string[] = [];
    let i = 0;
    while (i < expr.length) {
      const char = expr[i];
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      if (/[+\-*/()]/.test(char)) {
        tokens.push(char);
        i++;
        continue;
      }
      if (/\d|\./.test(char)) {
        let numStr = '';
        while (i < expr.length && /\d|\./.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
        tokens.push(numStr);
        continue;
      }
      // Unknown character inside math expression
      return null;
    }

    if (tokens.length === 0) return null;

    // Parser for basic arithmetic using Recursive Descent
    let tokenIndex = 0;

    function peek(): string | undefined {
      return tokens[tokenIndex];
    }

    function consume(): string {
      return tokens[tokenIndex++];
    }

    function parseExpression(): number {
      let result = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const term = parseTerm();
        if (op === '+') result += term;
        else result -= term;
      }
      return result;
    }

    function parseTerm(): number {
      let result = parseFactor();
      while (peek() === '*' || peek() === '/') {
        const op = consume();
        const factor = parseFactor();
        if (op === '*') result *= factor;
        else {
          if (factor === 0) return 0; // Avoid divide by zero crash
          result /= factor;
        }
      }
      return result;
    }

    function parseFactor(): number {
      const token = consume();
      if (!token) return 0;

      // Unary minus or plus
      if (token === '-') {
        return -parseFactor();
      }
      if (token === '+') {
        return parseFactor();
      }

      if (token === '(') {
        const val = parseExpression();
        if (peek() === ')') consume();
        return val;
      }

      const num = parseFloat(token);
      return isNaN(num) ? 0 : num;
    }

    const val = parseExpression();
    if (isNaN(val) || !isFinite(val)) return null;

    // If there are unconsumed tokens, expression is invalid
    if (tokenIndex < tokens.length) {
      return null;
    }

    // Round to 2 decimals to prevent floating point glitches
    return Math.round(val * 100) / 100;
  } catch {
    return null;
  }
}

/**
 * Analyzes a single line of note text.
 * Determines if it contains a payment or arithmetic calculation.
 */
export function analyzeLine(rawText: string, lineNumber: number): LineCalculation {
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

  const isTotalLine = /^[-*•]?\s*(?:итого|всего|общая сумма|расходы|остаток(?: бюджета)?|баланс|total|sum|balance)(?:\s*[:—\-=]|\s+|$)/i.test(
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
    // e.g. "Кофе 250 * 2" or "Бензин 2500" or "Аренда 3000"
    const match = normalized.match(
      /^(.*?)([\d\s+\-*/%().xX×÷]+(?:руб(?:лей|ля|\.?)|р\.?|rub|\$|€|₽|тенге)?)$/i
    );
    if (match && match[1] && match[2] && /\d/.test(match[2])) {
      label = match[1].trim();
      potentialExpr = match[2].trim();
    } else {
      potentialExpr = normalized;
    }
  }

  // Detect if line uses units of pieces (шт, штуки, ед, pcs)
  const isPiecesLine = /(?:\b\d+\s*(?:шт(?:\.|\b)|штук[а-я]*|ед(?:\.|\b)|pcs|items?))/iu.test(trimmed);

  // Strip currency words and symbols, or piece units
  let cleanExpr = stripCurrency(potentialExpr);
  if (isPiecesLine) {
    cleanExpr = cleanExpr
      .replace(/(?:шт(?:\.|\b)|штук[а-я]*|ед(?:\.|\b)|pcs|items?)/giu, '')
      .trim();
  }

  // Test if it has digits
  if (/\d/.test(cleanExpr)) {
    const result = safeEvalMath(cleanExpr);
    if (result !== null && !isNaN(result)) {
      let lineType: 'income' | 'expense' | 'total' | 'neutral' = 'neutral';
      if (isTotalLine) {
        lineType = 'total';
      } else if (
        trimmed.startsWith('+') ||
        /\b(?:прибыль|доход(?:ы)?|зарплат(?:а|ы)?|преми(?:я|и)|аванс|кешбэк|выручк(?:а|и)|получен(?:о|ы)|плюс)\b/i.test(trimmed)
      ) {
        lineType = 'income';
      } else if (
        trimmed.startsWith('-') ||
        /\b(?:расход(?:ы)?|трат(?:ы|а)|минус|покупк(?:а|и)|оплат(?:а|ы)|аренд(?:а|ы)|коммуналк(?:а|и))\b/i.test(trimmed)
      ) {
        lineType = 'expense';
      }

      return {
        lineNumber,
        rawText,
        expression: cleanExpr,
        result,
        currency: isPiecesLine ? 'шт.' : defaultCurrency,
        label,
        isTotalLine,
        type: lineType,
        isPieceCalculation: isPiecesLine,
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
 * Analyzes whole note text line-by-line and calculates grand total and currency breakdowns.
 */
export function analyzeNote(content: string): NoteCalculationSummary {
  const rawLines = content.split('\n');
  const lines: LineCalculation[] = [];
  const breakdownByCurrency: Record<string, number> = {};
  let totalCalculatedLines = 0;
  let primaryCurrency = '₽';
  let runningSubtotal = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalPieces = 0;
  let hasPieces = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const parsed = analyzeLine(rawLine, idx + 1);

    if (parsed.isTotalLine) {
      let totalSoFar: number;
      if (runningSubtotal > 0) {
        totalSoFar = Math.round(runningSubtotal * 100) / 100;
      } else if (parsed.result !== null && parsed.result > 0) {
        totalSoFar = parsed.result;
        runningSubtotal = parsed.result;
      } else {
        totalSoFar = 0;
      }

      parsed.result = totalSoFar;
      parsed.currency = primaryCurrency;
      lines.push(parsed);
    } else {
      if (parsed.result !== null) {
        totalCalculatedLines++;
        if (parsed.isPieceCalculation) {
          totalPieces += parsed.result;
          hasPieces = true;
        } else {
          const curr = parsed.currency;
          breakdownByCurrency[curr] = (breakdownByCurrency[curr] || 0) + parsed.result;
          primaryCurrency = curr;
          runningSubtotal += parsed.result;

          if (parsed.type === 'income') {
            totalIncome += parsed.result;
          } else if (parsed.type === 'expense') {
            totalExpenses += parsed.result;
          }
        }
      }
      lines.push(parsed);
    }
  }

  let finalGrandTotal = breakdownByCurrency[primaryCurrency] || runningSubtotal || 0;
  let finalCurrency = primaryCurrency;

  // If note only has piece calculations (or predominantly pieces and no monetary totals), set unit to "шт."
  if (finalGrandTotal === 0 && totalPieces > 0) {
    finalGrandTotal = totalPieces;
    finalCurrency = 'шт.';
  }

  const hasIncomeExpenseSplit = totalIncome > 0 && totalExpenses > 0;
  const netBalance = totalIncome - totalExpenses;
  const savingsRatePercent =
    totalIncome > 0
      ? Math.max(0, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100))
      : 0;

  return {
    lines,
    grandTotal: Math.round(finalGrandTotal * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
    hasIncomeExpenseSplit,
    savingsRatePercent,
    currency: finalCurrency,
    totalCalculatedLines,
    breakdownByCurrency,
    totalPieces: Math.round(totalPieces * 100) / 100,
    hasPiecesCalculation: hasPieces,
  };
}

/**
 * Format currency with thousands spaces
 * e.g. 35000 -> "35 000 ₽", 3000 -> "3 000 ₽", 15 -> "15 шт."
 */
export function formatMoney(amount: number, currency = '₽'): string {
  const rounded = Math.round(amount * 100) / 100;
  const parts = rounded.toFixed(rounded % 1 === 0 ? 0 : 2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formattedNum = parts.join('.');

  if (currency === '$') return `$${formattedNum}`;
  if (currency === '€') return `€${formattedNum}`;
  if (currency === 'шт.' || currency === 'шт') return `${formattedNum} шт.`;
  return `${formattedNum} ${currency}`;
}
