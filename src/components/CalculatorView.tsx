import React, { useState, useMemo } from 'react';
import { Note } from '../types';
import { analyzeNote, formatMoney } from '../utils/mathEngine';
import {
  Calculator,
  Plus,
  Receipt,
  Check,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';

interface CalculatorViewProps {
  notes: Note[];
  onOpenNote: (note: Note) => void;
  onCreatePaymentNote: () => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  notes,
  onOpenNote,
  onCreatePaymentNote,
}) => {
  const [scratchpadText, setScratchpadText] = useState<string>(
`=== Доходы (Прибыль) ===
+ Зарплата за месяц: 120 000 руб
+ Премия: 25 000
+ Кэшбэк и дивиденды: 3 500

=== Расходы (Траты) ===
- Аренда квартиры: 35 000 руб
- Коммунальные услуги: 2 400 + 850
- Продукты и кафе: 1 500 * 18
- Спортзал: 3 200
- Бензин и авто: 6 000

Остаток в итоге:`
  );
  const [copiedRes, setCopiedRes] = useState<string | null>(null);

  // Scratchpad live calculations
  const scratchpadSummary = useMemo(() => analyzeNote(scratchpadText), [scratchpadText]);

  // Aggregate stats across all saved notes
  const totalFinancialsAllNotes = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    let count = 0;

    notes.forEach((n) => {
      const math = analyzeNote(n.content);
      if (math.totalCalculatedLines > 0) {
        incomeSum += math.totalIncome;
        expenseSum += math.totalExpenses;
        count++;
      }
    });

    return {
      income: incomeSum,
      expenses: expenseSum,
      balance: incomeSum - expenseSum,
      count,
    };
  }, [notes]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRes(text);
    setTimeout(() => setCopiedRes(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-28 text-stone-900 dark:text-stone-100">
      {/* Top Overview Cards */}
      <div className="bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-800 rounded-3xl p-4 sm:p-5 mb-5 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400">
                <Calculator className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                Финансы: Прибыль и Расходы
              </h2>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Разделение списков на доходы и траты. От прибыли автоматически вычитаются расходы
            </p>
          </div>

          <button
            onClick={onCreatePaymentNote}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition active:scale-95 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Новый расчет / бюджет</span>
          </button>
        </div>

        {/* Global Summary Metric: Income vs Expenses vs Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-amber-900/10 dark:border-stone-800">
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl p-3 border border-emerald-200 dark:border-emerald-800/40">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Прибыль по всем заметкам</span>
            </span>
            <span className="text-lg font-bold text-emerald-900 dark:text-emerald-300 font-mono">
              +{formatMoney(totalFinancialsAllNotes.income, '₽')}
            </span>
          </div>

          <div className="bg-rose-50/80 dark:bg-rose-950/40 rounded-2xl p-3 border border-rose-200 dark:border-rose-800/40">
            <span className="text-[11px] text-rose-800 dark:text-rose-400 font-semibold flex items-center gap-1 mb-0.5">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Расходы по всем заметкам</span>
            </span>
            <span className="text-lg font-bold text-rose-900 dark:text-rose-300 font-mono">
              −{formatMoney(totalFinancialsAllNotes.expenses, '₽')}
            </span>
          </div>

          <div className="bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl p-3 border border-amber-200 dark:border-amber-800/40">
            <span className="text-[11px] text-amber-900 dark:text-amber-400 font-semibold flex items-center gap-1 mb-0.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Чистый остаток (итог)</span>
            </span>
            <span className={`text-lg font-bold font-mono ${
              totalFinancialsAllNotes.balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatMoney(totalFinancialsAllNotes.balance, '₽')}
            </span>
          </div>
        </div>
      </div>

      {/* SMART FINANCIAL SCRATCHPAD (Live Smart Notebook Calculator) */}
      <div className="bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-800 rounded-3xl p-4 sm:p-5 mb-5 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-base text-stone-900 dark:text-white">Интерактивный черновик-калькулятор</h3>
          </div>
          <span className="text-xs text-stone-600 dark:text-stone-400">
            Пишите строки с «+» для доходов и «-» для расходов
          </span>
        </div>

        {/* Scratchpad Cashflow Balance Header */}
        <div className="grid grid-cols-3 gap-2 mb-3 font-mono text-center">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
            <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold block">🟢 Прибыль</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300">
              +{formatMoney(scratchpadSummary.totalIncome, scratchpadSummary.currency)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40">
            <span className="text-[10px] text-rose-800 dark:text-rose-400 font-bold block">🔴 Расходы</span>
            <span className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-300">
              −{formatMoney(scratchpadSummary.totalExpenses, scratchpadSummary.currency)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40">
            <span className="text-[10px] text-amber-950 dark:text-amber-300 font-bold block">💰 Остаток</span>
            <span className={`text-xs sm:text-sm font-extrabold ${
              scratchpadSummary.netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatMoney(scratchpadSummary.netBalance, scratchpadSummary.currency)}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Input text on paper texture */}
          <div className="flex-1">
            <textarea
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
              rows={9}
              className="w-full bg-[#fffdf9] dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono text-xs sm:text-sm p-3.5 rounded-2xl border border-amber-900/15 dark:border-stone-800 focus:outline-none focus:border-amber-500 resize-none leading-6 selectable-text shadow-2xs font-medium"
            />
          </div>

          {/* Results column with color-coded profit / expense items */}
          <div className="sm:w-48 bg-stone-50 dark:bg-stone-950 rounded-2xl p-3 border border-stone-200 dark:border-stone-800 flex flex-col justify-between font-mono">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-600 dark:text-stone-400 tracking-wider block mb-2">
                Построчный расчет:
              </span>
              <div className="space-y-1.5 text-xs max-h-52 overflow-y-auto">
                {scratchpadSummary.lines.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between h-5">
                    <span className="text-stone-600 dark:text-stone-400 text-[10px] truncate max-w-[80px]">
                      {l.label || `стр ${idx + 1}`}
                    </span>
                    {l.result !== null ? (
                      <button
                        onClick={() => handleCopy(`${l.result} ₽`)}
                        className={`font-bold hover:underline cursor-pointer ${
                          l.isTotalLine
                            ? 'text-amber-700 dark:text-amber-400'
                            : l.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                        title="Скопировать"
                      >
                        {l.isTotalLine
                          ? `= ${formatMoney(l.result, l.currency)}`
                          : l.type === 'income'
                          ? `+${formatMoney(l.result, l.currency)}`
                          : `−${formatMoney(l.result, l.currency)}`}
                      </button>
                    ) : (
                      <span className="text-stone-400 dark:text-stone-600 text-[10px]">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2.5 border-t border-stone-200 dark:border-stone-800 mt-2">
              <span className="text-[10px] text-stone-600 dark:text-stone-400 block uppercase font-bold">Остаток в итоге:</span>
              <span className={`text-base font-extrabold ${
                scratchpadSummary.netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatMoney(scratchpadSummary.netBalance, scratchpadSummary.currency)}
              </span>
            </div>
          </div>
        </div>

        {copiedRes && (
          <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Скопировано: {copiedRes}</span>
          </div>
        )}
      </div>

      {/* Existing Payment Notes List */}
      <div className="bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
        <h3 className="font-bold text-base text-stone-900 dark:text-white mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Заметки со счетами, прибылью и расходами</span>
        </h3>

        <div className="space-y-2.5">
          {notes
            .filter((n) => (n.cachedTotal || 0) > 0 || (n.cachedIncome || 0) > 0 || n.category === 'payment')
            .map((n) => (
              <div
                key={n.id}
                onClick={() => onOpenNote(n)}
                className="bg-stone-50/80 dark:bg-stone-950/80 hover:bg-stone-100 dark:hover:bg-stone-950 border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-stone-700 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-2xs"
              >
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">{n.title || 'Финансовая запись'}</h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-1 mt-0.5">{n.content}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-stone-900 dark:text-white font-mono block">
                    {formatMoney(n.cachedNetBalance !== undefined ? n.cachedNetBalance : (n.cachedTotal || 0), n.currency || '₽')}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">Открыть →</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
