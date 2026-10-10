import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Note } from '../types';
import { analyzeNote, formatMoney } from '../utils/mathEngine';
import { extractShoppingItems } from '../utils/shoppingParser';
import {
  ArrowLeft,
  Trash2,
  Share2,
  Pin,
  ShoppingCart,
  Calculator,
  Check,
  Copy,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  onUpdate: (updated: Note) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onOpenShopping: (note: Note) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onUpdate,
  onDelete,
  onClose,
  onOpenShopping,
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState(note.category);
  const [isPinned, setIsPinned] = useState(note.isPinned || false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-analysis of math and shopping
  const mathSummary = useMemo(() => analyzeNote(content), [content]);
  const shoppingItems = useMemo(() => extractShoppingItems(content), [content]);

  // Synchronize state changes back to parent
  useEffect(() => {
    onUpdate({
      ...note,
      title,
      content,
      category,
      isPinned,
      updatedAt: Date.now(),
      cachedTotal: mathSummary.grandTotal,
      currency: mathSummary.currency,
      shoppingItemsCount: shoppingItems.length,
      completedItemsCount: shoppingItems.filter((i) => i.isCompleted).length,
    });
  }, [title, content, category, isPinned]);

  // Haptic feedback
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  // Insert snippet or operator at cursor position
  const insertTextAtCursor = (textToInsert: string) => {
    triggerHaptic();
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;

    const nextContent = current.substring(0, start) + textToInsert + current.substring(end);
    setContent(nextContent);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + textToInsert.length;
      textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  // Insert grand total line at bottom
  const handleInsertGrandTotal = () => {
    triggerHaptic();
    const totalLine = `\n\nИтого: ${formatMoney(mathSummary.grandTotal, mathSummary.currency)}`;
    setContent((prev) => prev.trim() + totalLine);
  };

  const handleCopyResult = (res: number, curr: string) => {
    triggerHaptic();
    const formatted = `${res} ${curr}`;
    navigator.clipboard.writeText(formatted);
    setCopiedText(formatted);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleShare = () => {
    triggerHaptic();
    let text = `${title}\n\n${content}`;
    if (mathSummary.grandTotal > 0) {
      text += `\n\n💰 Итого к оплате: ${formatMoney(mathSummary.grandTotal, mathSummary.currency)}`;
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title,
        text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedText('Заметка скопирована!');
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col safe-top safe-bottom">
      {/* Top action header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        {/* Right tools */}
        <div className="flex items-center gap-1.5">
          {shoppingItems.length > 0 && (
            <button
              onClick={() => onOpenShopping({ ...note, content, title })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition active:scale-95"
              title="Открыть корзину и где купить"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
              <span>Где купить ({shoppingItems.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              triggerHaptic();
              setIsPinned(!isPinned);
            }}
            className={`p-2 rounded-xl transition ${
              isPinned
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
            title="Закрепить"
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-300' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Поделиться"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              if (window.confirm('Удалить эту заметку?')) {
                onDelete(note.id);
                onClose();
              }
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title & Category Row */}
      <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/60 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название заметки..."
          className="w-full bg-transparent text-lg font-bold text-white placeholder-slate-500 focus:outline-none"
        />

        {/* Category chips */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'payment', label: '💸 Счета & Оплаты' },
            { id: 'shopping', label: '🛒 Покупки & Корзина' },
            { id: 'budget', label: '📊 Бюджет' },
            { id: 'general', label: '📝 Общее' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                triggerHaptic();
                setCategory(cat.id as any);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                category === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shopping Discovery Banner (if items detected) */}
      {shoppingItems.length > 0 && (
        <div
          onClick={() => onOpenShopping({ ...note, content, title })}
          className="mx-4 mt-3 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">
                  Найдено товаров: {shoppingItems.length}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 uppercase font-bold">
                  Корзина
                </span>
              </div>
              <p className="text-xs text-indigo-300/80">
                Купить на WB, Ozon, в Купере или в магазинах рядом →
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/30">
            Открыть
          </span>
        </div>
      )}

      {/* Editor Main Body: Textarea with Live Line Calculation Results Margin */}
      <div className="flex-1 flex overflow-hidden relative p-4 gap-3">
        {/* Main Textarea */}
        <div className="flex-1 h-full relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyUp={(e) => {
              const linesBefore = e.currentTarget.value
                .substring(0, e.currentTarget.selectionStart)
                .split('\n').length;
              setActiveLine(linesBefore);
            }}
            placeholder={`Вводите строки оплаты или покупок:
Аренда: 35000 руб
Свет + вода: 2400 + 1350
Обед: 450 * 2
Скидка: 3000 - 15%

- [ ] Молоко 3.2% 2 л
- [ ] Сыр 500 г
- [ ] Хлеб 1 шт`}
            className="w-full h-full bg-transparent text-slate-100 placeholder-slate-600 resize-none focus:outline-none font-mono text-sm leading-6 selectable-text"
          />
        </div>

        {/* Live Math Results Margin (Soulver / Calca style) */}
        {mathSummary.totalCalculatedLines > 0 && (
          <div className="w-28 sm:w-36 h-full overflow-y-auto pl-2 border-l border-slate-800/80 flex flex-col font-mono text-xs select-none">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calculator className="w-3 h-3 text-emerald-400" />
              <span>Расчет</span>
            </div>

            <div className="space-y-1">
              {mathSummary.lines.map((line, idx) => (
                <div key={idx} className="h-6 flex items-center justify-end">
                  {line.result !== null ? (
                    <button
                      onClick={() => handleCopyResult(line.result!, line.currency)}
                      className="group/res flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition active:scale-95 shadow-xs"
                      title="Нажмите, чтобы скопировать результат"
                    >
                      <span>= {formatMoney(line.result, line.currency)}</span>
                      <Copy className="w-2.5 h-2.5 opacity-0 group-hover/res:opacity-100 transition" />
                    </button>
                  ) : (
                    <span className="text-slate-700 text-[10px] select-none">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Copied toast notification */}
      {copiedText && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-semibold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
          <Check className="w-3.5 h-3.5" />
          <span>{copiedText}</span>
        </div>
      )}

      {/* Floating Grand Total Bar (When math calculations are present) */}
      {mathSummary.totalCalculatedLines > 0 && (
        <div className="mx-4 mb-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wide">
                Всего к оплате ({mathSummary.totalCalculatedLines} поз.)
              </span>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono leading-none">
                {formatMoney(mathSummary.grandTotal, mathSummary.currency)}
              </div>
            </div>
          </div>

          <button
            onClick={handleInsertGrandTotal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 shadow"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Вставить в заметку</span>
          </button>
        </div>
      )}

      {/* Mobile Math & Checklist Quick Keypad Toolbar */}
      <div className="px-3 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {[
          { label: '+', insert: ' + ' },
          { label: '-', insert: ' - ' },
          { label: '×', insert: ' * ' },
          { label: '÷', insert: ' / ' },
          { label: '%', insert: '%' },
          { label: '-10%', insert: ' - 10%' },
          { label: '-20%', insert: ' - 20%' },
          { label: '₽', insert: ' руб' },
          { label: 'к', insert: 'к' },
          { label: '- [ ] Чекбокс', insert: '\n- [ ] ' },
          { label: '• Список', insert: '\n• ' },
          { label: 'Итого:', insert: '\n\nИтого: ' },
        ].map((btn, idx) => (
          <button
            key={idx}
            onClick={() => insertTextAtCursor(btn.insert)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold whitespace-nowrap active:scale-95 transition border border-slate-700/50"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};
