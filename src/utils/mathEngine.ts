import { LineCalculation, NoteCalculationSummary } from '../types';

/**
 * Safely evaluates a simple arithmetic expression without using `eval`.
 * Supports +, -, *, /, %, parentheses, and percentage modifications.
 */
export function safeEvalMath(expressionStr: string): number | null {
  try {
    let expr = expressionStr.trim();
    if (!expr) return null;

    // Replace unicode multiplication and division symbols
    expr = expr.replace(/[×xX]/g, '*').replace(/[÷:]/g, '/');

    // Handle percentage discounts or additions like: "5000 - 20%" -> "5000 * (1 - 0.20)"
    // Pattern: [Number] [+ -] [Number]%
    expr = expr.replace(/(\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)\s*%/g, (_, base, op, pct) => {
      const b = parseFloat(base);
      const p = parseFloat(pct);
      const delta = (b * p) / 100;
      return op === '+' ? `${b + delta}` : `${b - delta}`;
    });

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
        while (i < expr.length && (/\d|\./.test(expr[i]))) {
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

    // Round to 2 decimals to prevent floating point glitches
    return Math.round(val * 100) / 100;
  } catch {
    return null;
  }
}

/**
 * Normalizes text line by replacing Russian money multipliers:
 * "5к" or "5k" -> "5000", "1.5 тыс" -> "1500", "2 млн" -> "2000000"
 */
function normalizeMultipliers(text: string): string {
  return text
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:к|k)\b/gi, (_, n) => `${parseFloat(n.replace(',', '.')) * 1000}`)
    .replace(/(\d+(?:[.,]\d+)?)\s*тыс(?:яч)?\.?\b/gi, (_, n) => `${parseFloat(n.replace(',', '.')) * 1000}`)
    .replace(/(\d+(?:[.,]\d+)?)\s*млн\.?\b/gi, (_, n) => `${parseFloat(n.replace(',', '.')) * 1000000}`);
}

/**
 * Extracts currency symbol from line
 */
function detectCurrency(text: string): string {
  if (/(\$|usd|доллар)/i.test(text)) return '$';
  if (/(€|eur|евро)/i.test(text)) return '€';
  if (/(₸|kzt|тенге)/i.test(text)) return '₸';
  if (/(Br|byn|бел\.?руб)/i.test(text)) return 'Br';
  if (/(₴|uah|гривн)/i.test(text)) return '₴';
  return '₽'; // Default Russian Ruble
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
    };
  }

  const isTotalLine = /^(итого|всего|общая сумма|расходы|баланс|total|sum)\b/i.test(trimmed);

  // Normalize comma decimals and abbreviations
  const normalized = normalizeMultipliers(trimmed.replace(/(\d+),(\d+)/g, '$1.$2'));

  // Split label from math expression
  // Patterns like:
  // "Обед в столовой: 450 + 120"
  // "Аренда - 35000"
  // "Зарплата = 120000"
  // "Такси 500 * 2 = "
  // "350 + 400 + 150"
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
    // e.g. "Кофе 250 * 2" or "Бензин 2500"
    const match = normalized.match(/^(.*?)([\d\s+\-*/%().xX×÷]+(?:руб|р|rub|\$|€|₽|тенге)?)$/i);
    if (match && match[1] && match[2] && /\d/.test(match[2])) {
      label = match[1].trim();
      potentialExpr = match[2].trim();
    } else {
      potentialExpr = normalized;
    }
  }

  // Strip currency words from math candidate
  const cleanExpr = potentialExpr
    .replace(/(?:руб(?:лей|\.?)|rub|usd|eur|тенге|бел\.?руб|гривен|\$|€|₽|₸|Br|₴)/gi, '')
    .trim();

  // Test if it has digits
  if (/\d/.test(cleanExpr)) {
    // Only evaluate if it contains operators OR is a standalone number
    const result = safeEvalMath(cleanExpr);
    if (result !== null && !isNaN(result)) {
      return {
        lineNumber,
        rawText,
        expression: cleanExpr,
        result,
        currency: defaultCurrency,
        label,
        isTotalLine,
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
  };
}

/**
 * Analyzes whole note text line-by-line and calculates grand total and currency breakdowns.
 */
export function analyzeNote(content: string): NoteCalculationSummary {
  const lines = content.split('\n').map((line, idx) => analyzeLine(line, idx + 1));
  const breakdownByCurrency: Record<string, number> = {};
  let totalCalculatedLines = 0;
  let primaryCurrency = '₽';

  for (const line of lines) {
    // Skip explicit user "итого:" lines from double counting
    if (line.result !== null && !line.isTotalLine) {
      totalCalculatedLines++;
      const curr = line.currency;
      breakdownByCurrency[curr] = (breakdownByCurrency[curr] || 0) + line.result;
      primaryCurrency = curr;
    }
  }

  const grandTotal = breakdownByCurrency[primaryCurrency] || 0;

  return {
    lines,
    grandTotal: Math.round(grandTotal * 100) / 100,
    currency: primaryCurrency,
    totalCalculatedLines,
    breakdownByCurrency,
  };
}

/**
 * Format currency with thousands spaces
 * e.g. 35000 -> "35 000 ₽"
 */
export function formatMoney(amount: number, currency = '₽'): string {
  const rounded = Math.round(amount * 100) / 100;
  const parts = rounded.toFixed(rounded % 1 === 0 ? 0 : 2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formattedNum = parts.join('.');

  if (currency === '$') return `$${formattedNum}`;
  if (currency === '€') return `€${formattedNum}`;
  return `${formattedNum} ${currency}`;
}
