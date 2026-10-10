import React, { useState, useMemo } from 'react';
import { Note } from '../types';
import { analyzeNote, formatMoney, safeEvalMath } from '../utils/mathEngine';
import {
  Calculator,
  Plus,
  Users,
  Percent,
  TrendingUp,
  Receipt,
  Copy,
  Check,
  Sparkles,
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
    `Зарплата за месяц: 120000
Аренда квартиры: -35000
Коммуналка + инет: -(2400 + 850)
Продукты и кафе: -(1500 * 20)
Спортзал: -3200

Остаток бюджета:`
  );
  const [copiedRes, setCopiedRes] = useState<string | null>(null);

  // Scratchpad live calculations
  const scratchpadSummary = useMemo(() => analyzeNote(scratchpadText), [scratchpadText]);

  // Aggregate stats across all saved notes
  const totalExpensesAllNotes = useMemo(() => {
    let sum = 0;
    let count = 0;
    notes.forEach((n) => {
      if (n.cachedTotal) {
        sum += n.cachedTotal;
        count++;
      }
    });
    return { sum, count };
  }, [notes]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRes(text);
    setTimeout(() => setCopiedRes(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28">
      {/* Top Overview Cards */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 rounded-3xl p-5 mb-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Calculator className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Оплаты & Финансовый расчет
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Автоматический подсчет всех сумм, счетов и математических выражений
            </p>
          </div>

          <button
            onClick={onCreatePaymentNote}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Новый счет / оплата</span>
          </button>
        </div>

        {/* Global Summary Metric */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Всего по всем заметкам</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {formatMoney(totalExpensesAllNotes.sum, '₽')}
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Заметок с оплатами</span>
            <span className="text-lg font-bold text-indigo-400 font-mono">
              {totalExpensesAllNotes.count} шт.
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 block mb-0.5">Средний чек заметки</span>
            <span className="text-lg font-bold text-cyan-400 font-mono">
              {totalExpensesAllNotes.count > 0
                ? formatMoney(Math.round(totalExpensesAllNotes.sum / totalExpensesAllNotes.count), '₽')
                : '0 ₽'}
            </span>
          </div>
        </div>
      </div>

      {/* SMART FINANCIAL SCRATCHPAD (Live Smart Notebook Calculator) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Умный блокнот-калькулятор</h3>
          </div>
          <span className="text-xs text-slate-400">
            Пишите числа, проценты и слова — результат считается на лету
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Input text */}
          <div className="flex-1">
            <textarea
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 text-slate-100 font-mono text-xs sm:text-sm p-3.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-6 selectable-text"
            />
          </div>

          {/* Results column */}
          <div className="sm:w-44 bg-slate-950 rounded-2xl p-3.5 border border-slate-800 flex flex-col justify-between font-mono">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                Построчный расчет:
              </span>
              <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
                {scratchpadSummary.lines.map((l, idx) => (
                  <div key={idx} className="flex items-center justify-between h-5">
                    <span className="text-slate-600 text-[10px] truncate max-w-[70px]">
                      {l.label || `стр ${idx + 1}`}
                    </span>
                    {l.result !== null ? (
                      <button
                        onClick={() => handleCopy(`${l.result} ₽`)}
                        className="text-emerald-400 font-bold hover:underline"
                        title="Скопировать"
                      >
                        = {formatMoney(l.result, l.currency)}
                      </button>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 mt-2">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Итог:</span>
              <span className="text-base font-bold text-emerald-400">
                {formatMoney(scratchpadSummary.grandTotal, scratchpadSummary.currency)}
              </span>
            </div>
          </div>
        </div>

        {copiedRes && (
          <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Скопировано: {copiedRes}</span>
          </div>
        )}
      </div>

      {/* Existing Payment Notes List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5">
        <h3 className="font-bold text-base text-white mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-indigo-400" />
          <span>Заметки со счетами и оплатами</span>
        </h3>

        <div className="space-y-2.5">
          {notes
            .filter((n) => (n.cachedTotal || 0) > 0 || n.category === 'payment')
            .map((n) => (
              <div
                key={n.id}
                onClick={() => onOpenNote(n)}
                className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-sm"
              >
                <div>
                  <h4 className="font-semibold text-sm text-white">{n.title || 'Счет'}</h4>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{n.content}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-emerald-400 font-mono block">
                    {formatMoney(n.cachedTotal || 0, n.currency || '₽')}
                  </span>
                  <span className="text-[10px] text-slate-500">Открыть →</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
