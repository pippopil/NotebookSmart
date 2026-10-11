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
  Sparkles,
  Grid,
  CheckCircle2,
  RotateCcw,
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
  const [category, setCategory] = useState<NoteCategory>(
    note.category === 'payment' ? 'note' : (note.category || 'note')
  );
  const [isPinned, setIsPinned] = useState(note.isPinned || false);
  const [eventDate, setEventDate] = useState(note.eventDate || '');
  const [eventTime, setEventTime] = useState(note.eventTime || '');
  const [isEventDone, setIsEventDone] = useState(note.isEventDone || false);
  const [paperStyle, setPaperStyle] = useState<'grid' | 'dark-grid' | 'lines' | 'plain'>(
    note.paperStyle || 'dark-grid'
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
      textarea.selectionStart = start + textToInsert.length;
      textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  // Insert or update grand total line
  const handleInsertGrandTotal = () => {
    triggerHaptic();
    const formattedTotal = formatMoney(mathSummary.grandTotal, mathSummary.currency);
    const totalLineRegex = /^([-*•]?\s*(?:итого|всего|общая сумма|расходы|total|sum)\s*[:—\-=]?).*$/im;

    if (totalLineRegex.test(content)) {
      const updated = content.replace(totalLineRegex, `Итого: ${formattedTotal}`);
      setContent(updated);
      setCopiedText(`Обновлено: ${formattedTotal}`);
      setTimeout(() => setCopiedText(null), 2000);
    } else {
      const totalLine = `\n\nИтого: ${formattedTotal}`;
      setContent((prev) => prev.trim() + totalLine);
      setCopiedText(`Вставлено: ${formattedTotal}`);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  const handleCopyResult = (res: number, curr: string, line?: any) => {
    triggerHaptic();
    const formatted = formatMoney(res, curr);

    // If user clicked on a total line, update that line directly in the note
    if (line && line.isTotalLine) {
      const totalLineRegex = /^([-*•]?\s*(?:итого|всего|общая сумма|расходы|total|sum)\s*[:—\-=]?).*$/im;
      if (totalLineRegex.test(content)) {
        const updated = content.replace(totalLineRegex, `Итого: ${formatted}`);
        setContent(updated);
        setCopiedText(`Вставлено: ${formatted}`);
        setTimeout(() => setCopiedText(null), 2000);
        return;
      }
    }

    navigator.clipboard.writeText(formatted);
    setCopiedText(formatted);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleShare = () => {
    triggerHaptic();
    let text = `${title}\n\n${content}`;
    if (category === 'event' && (eventDate || eventTime)) {
      text += `\n\n📅 Дата события: ${eventDate} ${eventTime}`;
    }
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

  // Paper styling class
  const paperClass = {
    'dark-grid': 'notebook-grid-dark text-slate-100',
    grid: 'notebook-grid-light text-slate-900',
    lines: 'notebook-lines text-slate-900',
    plain: 'bg-slate-950 text-slate-100',
  }[paperStyle];

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
          {category === 'shopping' || shoppingItems.length > 0 ? (
            <button
              onClick={() => onOpenShopping({ ...note, content, title })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition active:scale-95"
              title="Открыть корзину и где купить"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              <span>Где купить ({shoppingItems.length})</span>
            </button>
          ) : null}

          {/* Paper style switcher */}
          <button
            onClick={() => {
              triggerHaptic();
              setPaperStyle(
                paperStyle === 'dark-grid'
                  ? 'grid'
                  : paperStyle === 'grid'
                  ? 'lines'
                  : paperStyle === 'lines'
                  ? 'plain'
                  : 'dark-grid'
              );
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            title="Стиль страницы тетради"
          >
            <Grid className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {paperStyle === 'dark-grid'
                ? 'Клетка (тёмная)'
                : paperStyle === 'grid'
                ? 'Клетка (светлая)'
                : paperStyle === 'lines'
                ? 'Линейка'
                : 'Чистый лист'}
            </span>
          </button>

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
              if (window.confirm('Удалить эту страницу тетради?')) {
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

      {/* 3 PRIMARY CATEGORY BUTTONS (РАЗДЕЛЬНЫЙ ВЫБОР: ПРОСТО ЗАМЕТКИ / ПОКУПКИ / СОБЫТИЯ) */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 max-w-lg">
          <button
            onClick={() => {
              triggerHaptic();
              setCategory('note');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
              category === 'note' || category === 'general'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
              category === 'shopping'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
              category === 'event'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>События</span>
          </button>
        </div>

        {/* SPECIFIC EVENT CONTROLS IF "СОБЫТИЯ" IS SELECTED */}
        {category === 'event' && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                triggerHaptic();
                setIsEventDone(!isEventDone);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-medium transition ${
                isEventDone
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEventDone ? 'Завершено' : 'Отметить выполненным'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Title Header */}
      <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-800 shrink-0">
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
          className="w-full bg-transparent text-lg font-bold text-white placeholder-slate-500 focus:outline-none font-mono"
        />
      </div>

      {/* Shopping Discovery Banner (if items detected) */}
      {(category === 'shopping' || shoppingItems.length > 0) && (
        <div
          onClick={() => onOpenShopping({ ...note, content, title })}
          className="mx-4 mt-3 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">
                  Корзина покупок: {shoppingItems.length} товаров
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 uppercase font-bold">
                  Маркетплейсы
                </span>
              </div>
              <p className="text-xs text-emerald-300/80">
                Купить на WB, Ozon, в Купере, Самокате или магазинах рядом →
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-300 bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-500/40">
            Собрать корзину
          </span>
        </div>
      )}

      {/* ТЕТРАДЬ В КЛЕТОЧКУ (Graph Paper Notebook Surface with Margins and Spirals) */}
      <div className="flex-1 flex overflow-hidden relative m-3 rounded-2xl border border-slate-700/80 shadow-2xl">
        {/* Notebook Spiral Edge */}
        <div className="w-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/80 flex flex-col justify-around py-4 shrink-0 select-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-1.5 bg-slate-400/80 rounded-full mx-auto shadow-inner border border-slate-600"
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
              className={`w-full h-full bg-transparent resize-none focus:outline-none font-mono text-sm leading-6 selectable-text ${
                paperStyle === 'grid' || paperStyle === 'lines'
                  ? 'text-slate-900 placeholder-slate-400'
                  : 'text-slate-100 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Live Math Results Margin (Soulver / Calca style) */}
          {mathSummary.totalCalculatedLines > 0 && (
            <div className="w-28 sm:w-36 h-full overflow-y-auto pl-2 border-l border-slate-700/50 flex flex-col font-mono text-xs select-none shrink-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-emerald-400" />
                <span>Расчет</span>
              </div>

              <div className="space-y-1">
                {mathSummary.lines.map((line, idx) => (
                  <div key={idx} className="h-6 flex items-center justify-end">
                    {line.result !== null ? (
                      <button
                        onClick={() => handleCopyResult(line.result!, line.currency, line)}
                        className={`group/res flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-xs transition active:scale-95 shadow-xs ${
                          line.isTotalLine
                            ? 'bg-emerald-600/40 hover:bg-emerald-600/60 border-emerald-400 text-emerald-200'
                            : 'bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300'
                        }`}
                        title={line.isTotalLine ? 'Нажмите, чтобы вставить итог в строку' : 'Нажмите, чтобы скопировать результат'}
                      >
                        <span>= {formatMoney(line.result, line.currency)}</span>
                        <Copy className="w-2.5 h-2.5 opacity-0 group-hover/res:opacity-100 transition" />
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[10px] select-none">—</span>
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

      {/* Quick Keypad Toolbar */}
      <div className="px-3 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
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
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold whitespace-nowrap active:scale-95 transition border border-slate-700/50"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};
