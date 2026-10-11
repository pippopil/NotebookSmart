import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Note, NoteCategory } from '../types';
import { analyzeNote, formatMoney } from '../utils/mathEngine';
import { extractShoppingItems } from '../utils/shoppingParser';
import {
  ArrowLeft,
  Trash2,
  Share2,
  Pin,
  ShoppingCart,
  Calculator,
  Calendar,
  FileText,
  Clock,
  Check,
  Copy,
  PlusCircle,
  Grid,
  CheckCircle2,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

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
  const [category, setCategory] = useState<NoteCategory>(
    note.category === 'payment' ? 'note' : (note.category || 'note')
  );
  const [isPinned, setIsPinned] = useState(note.isPinned || false);
  const [eventDate, setEventDate] = useState(note.eventDate || '');
  const [eventTime, setEventTime] = useState(note.eventTime || '');
  const [isEventDone, setIsEventDone] = useState(note.isEventDone || false);
  const [paperStyle, setPaperStyle] = useState<'grid' | 'dark-grid' | 'lines' | 'plain'>(
    note.paperStyle === 'dark-grid' ? 'grid' : (note.paperStyle || 'grid')
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
      eventDate,
      eventTime,
      isEventDone,
      paperStyle,
      updatedAt: Date.now(),
      cachedTotal: mathSummary.grandTotal,
      currency: mathSummary.currency,
      shoppingItemsCount: shoppingItems.length,
      completedItemsCount: shoppingItems.filter((i) => i.isCompleted).length,
    });
  }, [title, content, category, isPinned, eventDate, eventTime, isEventDone, paperStyle]);

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

    setTimeout(() => {
      textarea.focus();
      const newPos = start + textToInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Copy result or insert calculation
  const handleCopyResult = (val: number, cur?: string, lineItem?: any) => {
    triggerHaptic();
    const str = formatMoney(val, cur);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(str);
      setCopiedText(`Скопировано: ${str}`);
      setTimeout(() => setCopiedText(null), 1800);
    }
  };

  // Insert grand total into text
  const handleInsertGrandTotal = () => {
    triggerHaptic();
    const totalStr = `\n\nИтого к оплате: ${formatMoney(mathSummary.grandTotal, mathSummary.currency)}`;
    setContent((prev) => prev + totalStr);
  };

  // Share note text
  const handleShare = async () => {
    triggerHaptic();
    const shareText = `${title ? title + '\n\n' : ''}${content}${
      mathSummary.grandTotal > 0
        ? `\n\nИтого: ${formatMoney(mathSummary.grandTotal, mathSummary.currency)}`
        : ''
    }`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Заметка NotebookSmart',
          text: shareText,
        });
      } catch (err) {
        // Ignored if cancelled
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopiedText('Заметка скопирована!');
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  // Paper styling class
  const paperClass = {
    'dark-grid': 'notebook-grid-dark text-stone-100',
    grid: 'notebook-grid-warm text-stone-900 dark:text-stone-100',
    lines: 'notebook-lines text-stone-900 dark:text-stone-100',
    plain: 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100',
  }[paperStyle];

  return (
    <div className="fixed inset-0 z-50 bg-[#faf7f2] dark:bg-[#141210] text-stone-900 dark:text-stone-100 flex flex-col safe-top safe-bottom transition-colors">
      {/* Top action header */}
      <div className="px-4 py-3 bg-[#fcfaf7]/90 dark:bg-stone-900/90 backdrop-blur-xl border-b border-amber-900/10 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm font-medium transition active:scale-95 cursor-pointer border border-stone-200 dark:border-stone-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        {/* Right tools */}
        <div className="flex items-center gap-1.5">
          {category === 'shopping' || shoppingItems.length > 0 ? (
            <button
              onClick={() => onOpenShopping({ ...note, content, title })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/30 dark:hover:bg-emerald-600/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
              title="Открыть корзину и где купить"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Где купить ({shoppingItems.length})</span>
            </button>
          ) : null}

          {/* Theme Toggle in Note Editor */}
          <ThemeToggle compact />

          {/* Paper style switcher */}
          <button
            onClick={() => {
              triggerHaptic();
              setPaperStyle(
                paperStyle === 'grid'
                  ? 'lines'
                  : paperStyle === 'lines'
                  ? 'plain'
                  : paperStyle === 'plain'
                  ? 'dark-grid'
                  : 'grid'
              );
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-medium transition cursor-pointer"
            title="Стиль страницы тетради"
          >
            <Grid className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">
              {paperStyle === 'grid'
                ? 'Клетка (теплая)'
                : paperStyle === 'lines'
                ? 'Линейка'
                : paperStyle === 'plain'
                ? 'Чистый лист'
                : 'Клетка (ночная)'}
            </span>
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              setIsPinned(!isPinned);
            }}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isPinned
                ? 'bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/40'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
            }`}
            title="Закрепить"
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
            title="Поделиться"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              if (window.confirm('Удалить эту страницу тетради?')) {
                onDelete(note.id);
                onClose();
              }
            }}
            className="p-2 rounded-xl bg-stone-100 hover:bg-rose-100 dark:bg-stone-800 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 PRIMARY CATEGORY BUTTONS */}
      <div className="px-4 py-2.5 bg-stone-50/80 dark:bg-stone-900 border-b border-amber-900/10 dark:border-stone-800 shrink-0">
        <div className="flex items-center gap-2 max-w-lg">
          <button
            onClick={() => {
              triggerHaptic();
              setCategory('note');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              category === 'note' || category === 'general'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-stone-200/70 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Просто заметка</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              setCategory('shopping');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              category === 'shopping'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'bg-stone-200/70 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Покупки</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              setCategory('event');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              category === 'event'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                : 'bg-stone-200/70 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>События</span>
          </button>
        </div>

        {/* SPECIFIC EVENT CONTROLS IF "СОБЫТИЯ" IS SELECTED */}
        {category === 'event' && (
          <div className="mt-2.5 pt-2 border-t border-amber-900/10 dark:border-stone-800 flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white dark:bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-800">
              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-transparent text-stone-900 dark:text-stone-200 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-800">
              <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="bg-transparent text-stone-900 dark:text-stone-200 text-xs focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                triggerHaptic();
                setIsEventDone(!isEventDone);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-medium transition cursor-pointer ${
                isEventDone
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEventDone ? 'Завершено' : 'Отметить выполненным'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Title Header */}
      <div className="px-5 py-3 bg-white/70 dark:bg-stone-900/60 border-b border-amber-900/10 dark:border-stone-800 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            category === 'event'
              ? 'Название события или встречи...'
              : category === 'shopping'
              ? 'Список покупок в тетрадке...'
              : 'Заголовок заметки...'
          }
          className="w-full bg-transparent text-lg font-bold text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none font-mono"
        />
      </div>

      {/* Shopping Discovery Banner (if items detected) */}
      {(category === 'shopping' || shoppingItems.length > 0) && (
        <div
          onClick={() => onOpenShopping({ ...note, content, title })}
          className="mx-4 mt-3 bg-gradient-to-r from-emerald-50 via-amber-50 to-orange-50 dark:from-emerald-950/60 dark:via-stone-900 dark:to-indigo-950/60 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-stone-900 dark:text-white">
                  Корзина покупок: {shoppingItems.length} товаров
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 uppercase font-bold">
                  Маркетплейсы
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-emerald-300/80">
                Купить на WB, Ozon, в Купере, Самокате или магазинах рядом →
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-500/40 shadow-2xs">
            Собрать корзину
          </span>
        </div>
      )}

      {/* ТЕТРАДЬ В КЛЕТОЧКУ (Graph Paper Notebook Surface with Margins and Spirals) */}
      <div className="flex-1 flex overflow-hidden relative m-3 rounded-2xl border border-amber-900/15 dark:border-stone-700/80 shadow-md">
        {/* Notebook Spiral Edge */}
        <div className="w-4 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 border-r border-amber-300/50 dark:border-slate-700/80 flex flex-col justify-around py-4 shrink-0 select-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-1.5 bg-amber-400/80 dark:bg-stone-400/80 rounded-full mx-auto shadow-inner border border-amber-600/40 dark:border-stone-600"
            />
          ))}
        </div>

        {/* Notebook Page Body with Graph Grid Texture */}
        <div className={`flex-1 flex overflow-hidden relative p-4 gap-3 ${paperClass} notebook-margin-red`}>
          {/* Main Textarea aligned on grid */}
          <div className="flex-1 h-full relative pl-8">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                category === 'event'
                  ? `План события в тетради:
14:00 — Встреча с коллегами
Кофе-брейк: 350 * 4
Подготовить отчет и слайды`
                  : category === 'shopping'
                  ? `Список продуктов в тетрадке:
- [ ] Молоко 3.2% 2 л
- [ ] Сыр 500 г
- [ ] Хлеб 1 шт
- [ ] Кофе зерновой 1 пачка`
                  : `Заметки в клеточку и расчет оплат:
Аренда квартиры: 35000 руб
Свет + вода: 2400 + 1350
Обед: 450 * 2
Скидка: 3000 - 15%`
              }
              className="w-full h-full bg-transparent resize-none focus:outline-none font-mono text-sm leading-6 selectable-text text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
            />
          </div>

          {/* Live Math Results Margin (Soulver / Calca style) */}
          {mathSummary.totalCalculatedLines > 0 && (
            <div className="w-28 sm:w-36 h-full overflow-y-auto pl-2 border-l border-amber-900/15 dark:border-stone-700/50 flex flex-col font-mono text-xs select-none shrink-0">
              <div className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Расчет</span>
              </div>

              <div className="space-y-1">
                {mathSummary.lines.map((line, idx) => (
                  <div key={idx} className="h-6 flex items-center justify-end">
                    {line.result !== null ? (
                      <button
                        onClick={() => handleCopyResult(line.result!, line.currency, line)}
                        className={`group/res flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-xs transition active:scale-95 shadow-2xs cursor-pointer ${
                          line.isTotalLine
                            ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-400 text-emerald-900 dark:bg-emerald-600/40 dark:hover:bg-emerald-600/60 dark:text-emerald-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 dark:border-emerald-500/40 dark:text-emerald-300'
                        }`}
                        title={line.isTotalLine ? 'Нажмите, чтобы вставить итог в строку' : 'Нажмите, чтобы скопировать результат'}
                      >
                        <span>= {formatMoney(line.result, line.currency)}</span>
                        <Copy className="w-2.5 h-2.5 opacity-0 group-hover/res:opacity-100 transition" />
                      </button>
                    ) : (
                      <span className="text-stone-400 dark:text-stone-600 text-[10px] select-none">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Copied toast notification */}
      {copiedText && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-semibold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
          <Check className="w-3.5 h-3.5" />
          <span>{copiedText}</span>
        </div>
      )}

      {/* Floating Grand Total Bar */}
      {mathSummary.totalCalculatedLines > 0 && (
        <div className="mx-4 mb-2 bg-white/90 dark:bg-stone-900/90 border border-amber-900/15 dark:border-stone-800 rounded-2xl p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 uppercase font-medium tracking-wide">
                Всего к оплате ({mathSummary.totalCalculatedLines} поз.)
              </span>
              <div className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono leading-none">
                {formatMoney(mathSummary.grandTotal, mathSummary.currency)}
              </div>
            </div>
          </div>

          <button
            onClick={handleInsertGrandTotal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 shadow cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Вставить в заметку</span>
          </button>
        </div>
      )}

      {/* Quick Keypad Toolbar */}
      <div className="px-3 py-2 bg-stone-100/90 dark:bg-stone-900 border-t border-amber-900/10 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {[
          { label: '+', insert: ' + ' },
          { label: '-', insert: ' - ' },
          { label: '×', insert: ' * ' },
          { label: '÷', insert: ' / ' },
          { label: '%', insert: '%' },
          { label: '-10%', insert: ' - 10%' },
          { label: '₽', insert: ' руб' },
          { label: 'к', insert: 'к' },
          { label: '- [ ] Чекбокс', insert: '\n- [ ] ' },
          { label: '• Список', insert: '\n• ' },
          { label: '⏰ Время', insert: ` ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ` },
          { label: 'Итого:', insert: '\n\nИтого: ' },
        ].map((btn, idx) => (
          <button
            key={idx}
            onClick={() => insertTextAtCursor(btn.insert)}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-xs font-semibold whitespace-nowrap active:scale-95 transition border border-stone-200 dark:border-stone-700/50 shadow-2xs cursor-pointer"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};
