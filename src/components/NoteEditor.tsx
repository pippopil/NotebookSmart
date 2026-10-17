import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Note, NoteCategory, PaperStyleType } from '../types';
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
  TrendingUp,
  TrendingDown,
  Wallet,
  Sparkles,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  Tag,
  X,
  Plus,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Eye,
  Edit3,
  Send,
  MessageCircle,
  Mic,
  MicOff,
  Square,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ShareNoteModal } from './ShareNoteModal';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { useSpeechDictation } from '../hooks/useSpeechDictation';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  formatReminderDateTime,
  toDateTimeLocalString,
  NotificationPermissionState,
} from '../services/notifications';
import {
  generateAutoTags,
  POPULAR_TAGS,
  normalizeTag,
} from '../services/aiTagging';

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
    note.category === 'payment' ? 'payment' : (note.category || 'note')
  );
  const [isPinned, setIsPinned] = useState(note.isPinned || false);
  const [eventDate, setEventDate] = useState(note.eventDate || '');
  const [eventTime, setEventTime] = useState(note.eventTime || '');
  const [isEventDone, setIsEventDone] = useState(note.isEventDone || false);
  const [paperStyle, setPaperStyle] = useState<PaperStyleType>(
    note.paperStyle === 'dark-grid' ? 'grid' : (note.paperStyle || 'grid')
  );
  const [showPaperMenu, setShowPaperMenu] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Push Notifications & Reminders state
  const [reminderEnabled, setReminderEnabled] = useState(note.reminderEnabled || false);
  const [reminderDateTime, setReminderDateTime] = useState<string>(() => {
    if (note.reminderDateTime) return note.reminderDateTime;
    if (note.category === 'event' && note.eventDate && note.eventTime) {
      return `${note.eventDate}T${note.eventTime}`;
    }
    const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
    return toDateTimeLocalString(defaultDate);
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );
  const [testNotifSent, setTestNotifSent] = useState(false);

  // Tags & AI Auto-tagging state
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoadingAiTags, setIsLoadingAiTags] = useState<boolean>(false);
  const [tagInput, setTagInput] = useState<string>('');
  const [isAiSource, setIsAiSource] = useState<boolean>(false);

  // Formatting & Preview Mode
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isSocialShareOpen, setIsSocialShareOpen] = useState<boolean>(false);

  // Mobile swipe navigation: swipe horizontally returns to main notes screen
  useSwipeBack({
    onBack: onClose,
    enabled: true,
  });

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
      tags,
      isPinned,
      eventDate,
      eventTime,
      isEventDone,
      paperStyle,
      reminderEnabled,
      reminderDateTime,
      reminderTriggered: false,
      updatedAt: Date.now(),
      cachedTotal: mathSummary.grandTotal,
      cachedIncome: mathSummary.totalIncome,
      cachedExpenses: mathSummary.totalExpenses,
      cachedNetBalance: mathSummary.netBalance,
      cachedPieces: mathSummary.totalPieces,
      currency: mathSummary.currency,
      shoppingItemsCount: shoppingItems.length,
      completedItemsCount: shoppingItems.filter((i) => i.isCompleted).length,
    });
  }, [
    title,
    content,
    category,
    tags,
    isPinned,
    eventDate,
    eventTime,
    isEventDone,
    paperStyle,
    reminderEnabled,
    reminderDateTime,
  ]);

  // Haptic feedback
  const triggerHaptic = (ms: number = 12) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  // Add a tag to current note
  const handleAddTag = (tagToAdd: string) => {
    const norm = normalizeTag(tagToAdd);
    if (!norm) return;
    triggerHaptic(10);
    if (!tags.includes(norm)) {
      setTags((prev) => [...prev, norm]);
    }
    setSuggestedTags((prev) => prev.filter((t) => t.toLowerCase() !== norm.toLowerCase()));
    setTagInput('');
  };

  // Remove a tag
  const handleRemoveTag = (tagToRemove: string) => {
    triggerHaptic(10);
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Trigger AI Auto-Tagging
  const handleTriggerAiTagging = async () => {
    triggerHaptic(15);
    setIsLoadingAiTags(true);
    try {
      const res = await generateAutoTags(title, content, category);
      // Filter out tags already added
      const filtered = res.tags.filter(
        (t) => !tags.some((existing) => existing.toLowerCase() === t.toLowerCase())
      );
      setSuggestedTags(filtered);
      setIsAiSource(res.isAiGenerated);
    } catch {
      // Handled internally in generateAutoTags
    } finally {
      setIsLoadingAiTags(false);
    }
  };

  // Suggest tags automatically for new notes when title/content has sufficient context
  useEffect(() => {
    const combined = `${title} ${content}`.trim();
    if (combined.length >= 6 && tags.length === 0 && suggestedTags.length === 0) {
      const timer = setTimeout(() => {
        handleTriggerAiTagging();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [title, content]);

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

  // Voice Dictation (Web Speech API)
  const [useSmartPunctuation, setUseSmartPunctuation] = useState<boolean>(true);

  const handleSpeechFinal = (finalChunk: string) => {
    triggerHaptic(10);
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = textarea.value;
      let textToInsert = finalChunk;
      if (
        start > 0 &&
        !/\s$/.test(current.substring(0, start)) &&
        !/^\s/.test(textToInsert) &&
        !/^[.,;:!?]/.test(textToInsert)
      ) {
        textToInsert = ' ' + textToInsert;
      }
      const nextContent = current.substring(0, start) + textToInsert + current.substring(end);
      setContent(nextContent);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + textToInsert.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 10);
    } else {
      setContent((prev) => {
        if (!prev) return finalChunk.trim();
        const needsSpace = !/\s$/.test(prev) && !/^[.,;:!?]/.test(finalChunk);
        return prev + (needsSpace ? ' ' : '') + finalChunk;
      });
    }
  };

  const {
    isListening,
    interimTranscript,
    error: speechError,
    clearError: clearSpeechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    toggleListening,
  } = useSpeechDictation({
    onFinalTranscript: handleSpeechFinal,
    lang: 'ru-RU',
    smartPunctuation: useSmartPunctuation,
  });

  // Text formatting: wraps selection with markers, bold, italic or underline
  const wrapSelection = (prefix: string, suffix: string) => {
    triggerHaptic(10);
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + prefix + suffix);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}выделение${suffix}`;
    const nextContent = current.substring(0, start) + replacement + current.substring(end);
    setContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + (selected ? selected.length : 9);
      textarea.setSelectionRange(cursorStart, cursorEnd);
    }, 15);
  };

  // Copy result or insert calculation
  const handleCopyResult = (val: number, cur?: string) => {
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
    const label = mathSummary.hasIncomeExpenseSplit
      ? 'Остаток в итоге:'
      : 'Итого к оплате:';
    const totalStr = `\n\n${label} ${formatMoney(mathSummary.grandTotal, mathSummary.currency)}`;
    setContent((prev) => prev + totalStr);
  };

  // Share note text across social media or system share
  const handleShare = () => {
    triggerHaptic();
    setIsSocialShareOpen(true);
  };

  // Paper styling class mapping
  const paperClass = {
    'dark-grid': 'notebook-grid-dark',
    grid: 'notebook-grid-warm',
    lines: 'notebook-lines',
    kraft: 'notebook-kraft',
    dots: 'notebook-dots',
    plain: 'notebook-plain',
  }[paperStyle] || 'notebook-grid-warm';

  const paperNames: Record<PaperStyleType, string> = {
    grid: 'В клетку (тетрадь)',
    lines: 'В линейку',
    kraft: 'Крафтовая бумага',
    dots: 'Точечная (Bullet)',
    plain: 'Чистый лист (слоновая кость)',
    'dark-grid': 'Ночная клетка',
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#faf7f2] dark:bg-[#141210] text-stone-900 dark:text-stone-100 flex flex-col safe-top safe-bottom transition-colors">
      {/* COMPACT & RESPONSIVE TOP ACTION HEADER (Never overflows on mobile) */}
      <div className="px-3 sm:px-4 py-2.5 bg-[#fcfaf7]/95 dark:bg-stone-900/95 backdrop-blur-xl border-b border-amber-900/10 dark:border-stone-800 flex items-center justify-between gap-1.5 shrink-0 z-20">
        {/* Back Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer border border-stone-200 dark:border-stone-700 shrink-0"
          title="Вернуться к списку заметок"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Назад</span>
        </button>

        {/* Right Tools: Day/Night, Paper, Shopping, Pin, Share, Delete */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Day / Night mode toggle */}
          <ThemeToggle compact />

          {/* Paper Texture Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                triggerHaptic();
                setShowPaperMenu(!showPaperMenu);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-medium transition cursor-pointer"
              title="Выбрать фактуру бумаги"
            >
              <Grid className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden md:inline">{paperNames[paperStyle]}</span>
            </button>

            {showPaperMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-700 rounded-2xl shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95">
                <div className="text-[10px] uppercase font-bold text-stone-600 dark:text-stone-300 px-2 py-1 tracking-wider">
                  Фактура бумаги
                </div>
                {(['grid', 'lines', 'kraft', 'dots', 'plain'] as PaperStyleType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      triggerHaptic();
                      setPaperStyle(p);
                      setShowPaperMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                      paperStyle === p
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold'
                        : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span>{paperNames[p]}</span>
                    {paperStyle === p && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shopping quick link if items exist */}
          {(category === 'shopping' || shoppingItems.length > 0) && (
            <button
              onClick={() => onOpenShopping({ ...note, content, title })}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-100/90 hover:bg-emerald-200 dark:bg-emerald-600/30 dark:hover:bg-emerald-600/40 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
              title="Открыть корзину покупок"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>{shoppingItems.length}</span>
            </button>
          )}

          {/* Voice dictation button in top bar (Web Speech API) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              if (!isSpeechSupported) {
                setCopiedText('Голосовой ввод не поддерживается браузером');
                setTimeout(() => setCopiedText(null), 2500);
                return;
              }
              toggleListening();
            }}
            className={`p-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1 ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-600 shadow-md animate-pulse'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
            }`}
            title={
              isListening
                ? 'Идет запись... Нажмите, чтобы остановить'
                : isSpeechSupported
                ? 'Диктовать заметку голосом (Web Speech API)'
                : 'Голосовой ввод не поддерживается в этом браузере'
            }
          >
            {isListening ? (
              <>
                <Mic className="w-4 h-4 animate-bounce text-white" />
                <span className="text-[11px] font-bold hidden sm:inline text-white">Запись...</span>
              </>
            ) : (
              <Mic className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            )}
          </button>

          {/* Pin note button */}
          <button
            onClick={() => {
              triggerHaptic();
              setIsPinned(!isPinned);
            }}
            className={`p-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              isPinned
                ? 'bg-amber-400/25 text-amber-900 dark:text-amber-300 border border-amber-400/40'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
            }`}
            title={isPinned ? 'Открепить' : 'Закрепить'}
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500 text-amber-700' : ''}`} />
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer shrink-0"
            title="Поделиться заметкой"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Delete button */}
          <button
            onClick={() => {
              triggerHaptic();
              if (window.confirm('Удалить эту страницу тетради?')) {
                onDelete(note.id);
                onClose();
              }
            }}
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-100 dark:bg-stone-800 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-stone-200 dark:border-stone-700 transition cursor-pointer shrink-0"
            title="Удалить страницу"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CATEGORY SELECTOR (Never overflows, wrap-protected) */}
      <div className="px-3 sm:px-4 py-2 bg-stone-50/90 dark:bg-stone-900/90 border-b border-amber-900/10 dark:border-stone-800 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: 'note', label: 'Заметка', icon: FileText, activeClass: 'bg-blue-600 text-white' },
            { id: 'payment', label: 'Финансы', icon: Calculator, activeClass: 'bg-amber-600 text-white' },
            { id: 'shopping', label: 'Покупки', icon: ShoppingCart, activeClass: 'bg-emerald-600 text-white' },
            { id: 'event', label: 'События', icon: Calendar, activeClass: 'bg-purple-600 text-white' },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id || (cat.id === 'note' && category === 'general');
            return (
              <button
                key={cat.id}
                onClick={() => {
                  triggerHaptic();
                  setCategory(cat.id as NoteCategory);
                }}
                className={`flex-1 min-w-[76px] flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? `${cat.activeClass} shadow-xs`
                    : 'bg-stone-200/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 hover:bg-stone-300/80 dark:hover:bg-stone-700'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Specific controls if "События" is selected */}
        {category === 'event' && (
          <div className="mt-2 pt-2 border-t border-amber-900/10 dark:border-stone-800 flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white dark:bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-800">
              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-transparent text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-800">
              <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="bg-transparent text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                triggerHaptic();
                setIsEventDone(!isEventDone);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isEventDone
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isEventDone ? 'Завершено' : 'Отметить выполненным'}</span>
            </button>
          </div>
        )}

        {/* PUSH NOTIFICATIONS / REMINDER CONTROLS (for Event & Shopping notes) */}
        {(category === 'event' || category === 'shopping') && (
          <div className="mt-2.5 pt-2.5 border-t border-amber-900/10 dark:border-stone-800 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    triggerHaptic();
                    if (!reminderEnabled && notifPermission !== 'granted') {
                      const granted = await requestNotificationPermission();
                      setNotifPermission(granted ? 'granted' : 'denied');
                    }
                    setReminderEnabled(!reminderEnabled);
                  }}
                  className={`p-1.5 rounded-xl border transition cursor-pointer ${
                    reminderEnabled
                      ? category === 'event'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                  title={reminderEnabled ? 'Выключить напоминание' : 'Включить напоминание'}
                >
                  {reminderEnabled ? (
                    <BellRing className="w-4 h-4 animate-bounce" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-white">
                    <span>Напоминание (Push-уведомление)</span>
                    {reminderEnabled && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono">
                        Активно
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                    {reminderEnabled
                      ? formatReminderDateTime(reminderDateTime) || 'Время не выбрано'
                      : category === 'event'
                      ? 'Получить пуш перед событием'
                      : 'Напомнить пойти за покупками'}
                  </span>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={async () => {
                  triggerHaptic();
                  if (!reminderEnabled && notifPermission !== 'granted') {
                    const granted = await requestNotificationPermission();
                    setNotifPermission(granted ? 'granted' : 'denied');
                  }
                  setReminderEnabled(!reminderEnabled);
                }}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  reminderEnabled
                    ? category === 'event'
                      ? 'bg-purple-600'
                      : 'bg-emerald-600'
                    : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                    reminderEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Expanded Reminder Configuration */}
            {reminderEnabled && (
              <div className="mt-2.5 pt-2 border-t border-dashed border-amber-900/15 dark:border-stone-800 space-y-2 animate-in fade-in">
                {/* Datetime picker */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-stone-950 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 flex-1 min-w-[200px]">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <input
                      type="datetime-local"
                      value={reminderDateTime}
                      onChange={(e) => setReminderDateTime(e.target.value)}
                      className="bg-transparent text-stone-900 dark:text-stone-100 text-xs focus:outline-none w-full"
                    />
                  </div>

                  {/* Browser permission button / test chime */}
                  {notifPermission !== 'granted' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const granted = await requestNotificationPermission();
                        setNotifPermission(granted ? 'granted' : 'denied');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[11px] transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Bell className="w-3 h-3" />
                      <span>Разрешить Push в браузере</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await sendTestNotification();
                        setTestNotifSent(true);
                        setTimeout(() => setTestNotifSent(false), 2500);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium text-[11px] transition cursor-pointer flex items-center gap-1 shrink-0"
                      title="Проверить громкость звука и доставку пуш-уведомления"
                    >
                      <Volume2 className="w-3 h-3 text-emerald-600" />
                      <span>{testNotifSent ? '✓ Звук и пуш отправлены!' : 'Тест звука & пуша'}</span>
                    </button>
                  )}
                </div>

                {/* Quick Reminder Preset Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  <span className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold shrink-0">
                    Быстро:
                  </span>
                  {category === 'event' ? (
                    <>
                      {eventDate && eventTime && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setReminderDateTime(`${eventDate}T${eventTime}`);
                          }}
                          className="px-2 py-0.8 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] whitespace-nowrap cursor-pointer"
                        >
                          В момент события
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          let base = new Date();
                          if (eventDate && eventTime) {
                            base = new Date(`${eventDate}T${eventTime}`);
                          }
                          const target = new Date(base.getTime() - 15 * 60 * 1000);
                          setReminderDateTime(toDateTimeLocalString(target));
                        }}
                        className="px-2 py-0.8 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[11px] whitespace-nowrap cursor-pointer"
                      >
                        За 15 мин
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          let base = new Date();
                          if (eventDate && eventTime) {
                            base = new Date(`${eventDate}T${eventTime}`);
                          }
                          const target = new Date(base.getTime() - 60 * 60 * 1000);
                          setReminderDateTime(toDateTimeLocalString(target));
                        }}
                        className="px-2 py-0.8 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[11px] whitespace-nowrap cursor-pointer"
                      >
                        За 1 час
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          let base = new Date();
                          if (eventDate && eventTime) {
                            base = new Date(`${eventDate}T${eventTime}`);
                          }
                          const target = new Date(base.getTime() - 24 * 60 * 60 * 1000);
                          setReminderDateTime(toDateTimeLocalString(target));
                        }}
                        className="px-2 py-0.8 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[11px] whitespace-nowrap cursor-pointer"
                      >
                        За 1 день
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setReminderDateTime(toDateTimeLocalString(new Date(Date.now() + 30 * 60 * 1000)));
                        }}
                        className="px-2 py-0.8 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] whitespace-nowrap cursor-pointer"
                      >
                        +30 мин
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setReminderDateTime(toDateTimeLocalString(new Date(Date.now() + 60 * 60 * 1000)));
                        }}
                        className="px-2 py-0.8 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] whitespace-nowrap cursor-pointer"
                      >
                        +1 час
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          const d = new Date();
                          d.setHours(19, 0, 0, 0);
                          if (d.getTime() < Date.now()) {
                            d.setDate(d.getDate() + 1);
                          }
                          setReminderDateTime(toDateTimeLocalString(d));
                        }}
                        className="px-2 py-0.8 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[11px] whitespace-nowrap cursor-pointer"
                      >
                        Сегодня 19:00
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          d.setHours(10, 0, 0, 0);
                          setReminderDateTime(toDateTimeLocalString(d));
                        }}
                        className="px-2 py-0.8 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[11px] whitespace-nowrap cursor-pointer"
                      >
                        Завтра 10:00
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note Title Input with Clear High Contrast */}
      <div className="px-4 py-2.5 bg-white/80 dark:bg-stone-900/60 border-b border-amber-900/10 dark:border-stone-800 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            category === 'event'
              ? 'Название события или встречи...'
              : category === 'shopping'
              ? 'Список покупок в тетрадке...'
              : category === 'payment'
              ? 'Учет доходов, расходов и баланса...'
              : 'Заголовок страницы тетради...'
          }
          className="w-full bg-transparent text-base sm:text-lg font-bold text-stone-900 dark:text-white placeholder-stone-500/70 dark:placeholder-stone-400 focus:outline-none font-mono"
        />
      </div>

      {/* AI AUTO-TAGGING & ORGANIZATION BAR */}
      <div className="px-4 py-2 bg-stone-50/90 dark:bg-stone-900/50 border-b border-amber-900/10 dark:border-stone-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-stone-500 dark:text-stone-400 font-semibold text-[11px] mr-0.5">
            <Tag className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Теги:</span>
          </div>

          {/* Existing tags */}
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100/90 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-amber-300/80 dark:border-stone-700 font-mono text-[11px] font-bold"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-100 cursor-pointer p-0.5"
                title="Удалить тег"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {/* Quick Add Custom Tag Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (tagInput.trim()) {
                handleAddTag(tagInput);
              }
            }}
            className="inline-flex items-center"
          >
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="+ свой #тег..."
              className="w-24 px-2 py-0.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-[11px] font-mono focus:outline-none focus:border-amber-500 focus:w-32 transition-all placeholder-stone-400"
            />
          </form>

          {/* AI Generate Tags Button */}
          <button
            type="button"
            onClick={handleTriggerAiTagging}
            disabled={isLoadingAiTags}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-900 dark:text-amber-300 border border-amber-400/40 text-[11px] font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 ml-auto"
            title="Автоматически подобрать теги по смыслу заметки с помощью AI"
          >
            <Sparkles
              className={`w-3 h-3 text-amber-600 dark:text-amber-400 ${
                isLoadingAiTags ? 'animate-spin' : ''
              }`}
            />
            <span>{isLoadingAiTags ? 'Анализ AI...' : 'AI авто-теги'}</span>
          </button>
        </div>

        {/* AI Suggestions Row */}
        {suggestedTags.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              <span>{isAiSource ? 'AI предлагает:' : 'Рекомендации:'}</span>
            </span>
            {suggestedTags.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleAddTag(sug)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 font-mono text-[11px] font-bold transition active:scale-95 cursor-pointer"
                title={`Добавить тег ${sug}`}
              >
                <span>+</span>
                <span>{sug}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                suggestedTags.forEach((s) => {
                  if (!tags.includes(s)) {
                    setTags((prev) => [...prev, s]);
                  }
                });
                setSuggestedTags([]);
              }}
              className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold ml-1 cursor-pointer"
            >
              Добавить все
            </button>
          </div>
        )}
      </div>

      {/* FINANCIAL BREAKDOWN PANEL: ПРИБЫЛЬ vs РАСХОДЫ vs ОСТАТОК */}
      {(mathSummary.hasIncomeExpenseSplit || category === 'payment') && (
        <div className="mx-3 sm:mx-4 mt-2 bg-white/95 dark:bg-stone-900/90 border border-amber-900/15 dark:border-stone-800 rounded-2xl p-3 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-900/10 dark:border-stone-800">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Баланс: Прибыль минус Расходы</span>
            </span>
            {mathSummary.totalIncome > 0 && (
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                Норма сбережений: {mathSummary.savingsRatePercent}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            {/* Income */}
            <div className="p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 block font-semibold">
                🟢 Прибыль (доходы)
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300">
                +{formatMoney(mathSummary.totalIncome, mathSummary.currency)}
              </span>
            </div>

            {/* Expenses */}
            <div className="p-2 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40">
              <span className="text-[10px] text-rose-800 dark:text-rose-400 block font-semibold">
                🔴 Расходы (траты)
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-300">
                −{formatMoney(mathSummary.totalExpenses, mathSummary.currency)}
              </span>
            </div>

            {/* Net Remaining Balance */}
            <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40">
              <span className="text-[10px] text-amber-900 dark:text-amber-300 block font-semibold">
                💰 Остаток (итог)
              </span>
              <span className={`text-xs sm:text-sm font-extrabold ${
                mathSummary.netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatMoney(mathSummary.netBalance, mathSummary.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TEXT FORMATTING TOOLBAR (Bold, Italic, Underline, Color Markers & Preview Mode) */}
      <div className="px-3 sm:px-4 py-1.5 bg-stone-50/90 dark:bg-stone-900/90 border-b border-amber-900/10 dark:border-stone-800 flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 mr-1 flex items-center gap-1">
            <Highlighter className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Стиль:</span>
          </span>

          {/* Bold Button */}
          <button
            type="button"
            onClick={() => wrapSelection('**', '**')}
            className="p-1 sm:px-2 sm:py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-700 font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs"
            title="Сделать жирным (**текст**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic Button */}
          <button
            type="button"
            onClick={() => wrapSelection('*', '*')}
            className="p-1 sm:px-2 sm:py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-700 font-serif italic text-xs transition active:scale-95 cursor-pointer shadow-2xs"
            title="Сделать курсивом (*текст*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline Button */}
          <button
            type="button"
            onClick={() => wrapSelection('<u>', '</u>')}
            className="p-1 sm:px-2 sm:py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-700 underline text-xs transition active:scale-95 cursor-pointer shadow-2xs"
            title="Подчеркнуть текст (<u>текст</u>)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          {/* Color Highlighters */}
          <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
            {/* Yellow Marker */}
            <button
              type="button"
              onClick={() => wrapSelection('<mark class="marker-yellow">', '</mark>')}
              className="w-5 h-5 rounded-full bg-yellow-300 hover:scale-110 active:scale-95 border border-yellow-500/50 transition cursor-pointer shadow-2xs"
              title="Выделить желтым маркером"
            />

            {/* Green Marker */}
            <button
              type="button"
              onClick={() => wrapSelection('<mark class="marker-green">', '</mark>')}
              className="w-5 h-5 rounded-full bg-emerald-400 hover:scale-110 active:scale-95 border border-emerald-600/50 transition cursor-pointer shadow-2xs"
              title="Выделить зеленым маркером"
            />

            {/* Pink Marker */}
            <button
              type="button"
              onClick={() => wrapSelection('<mark class="marker-pink">', '</mark>')}
              className="w-5 h-5 rounded-full bg-pink-400 hover:scale-110 active:scale-95 border border-pink-600/50 transition cursor-pointer shadow-2xs"
              title="Выделить розовым маркером"
            />

            {/* Blue Marker */}
            <button
              type="button"
              onClick={() => wrapSelection('<mark class="marker-blue">', '</mark>')}
              className="w-5 h-5 rounded-full bg-sky-400 hover:scale-110 active:scale-95 border border-sky-600/50 transition cursor-pointer shadow-2xs"
              title="Выделить голубым маркером"
            />

            {/* Orange Marker */}
            <button
              type="button"
              onClick={() => wrapSelection('<mark class="marker-orange">', '</mark>')}
              className="w-5 h-5 rounded-full bg-orange-400 hover:scale-110 active:scale-95 border border-orange-600/50 transition cursor-pointer shadow-2xs"
              title="Выделить оранжевым маркером"
            />

            {/* Purple Marker */}
            <button
              type="button"
              onClick={() => wrapSelection('<mark class="marker-purple">', '</mark>')}
              className="w-5 h-5 rounded-full bg-purple-400 hover:scale-110 active:scale-95 border border-purple-600/50 transition cursor-pointer shadow-2xs"
              title="Выделить сиреневым маркером"
            />
          </div>
        </div>

        {/* Right Tools: Voice Dictation & Mode Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Dictation Button in Toolbar */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              if (!isSpeechSupported) {
                setCopiedText('Голосовой ввод не поддерживается браузером');
                setTimeout(() => setCopiedText(null), 2500);
                return;
              }
              toggleListening();
            }}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-semibold transition active:scale-95 border cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 animate-pulse shadow-xs'
                : 'bg-white hover:bg-rose-50/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
            }`}
            title={isListening ? 'Остановить запись голоса' : 'Диктовать заметку голосом (Web Speech API)'}
          >
            <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce text-white' : 'text-rose-500'}`} />
            <span>{isListening ? 'Слушаю...' : 'Диктовка'}</span>
          </button>

          {/* Mode Switcher: Edit or Preview */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setIsPreviewMode(!isPreviewMode);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition active:scale-95 border cursor-pointer shrink-0 ${
              isPreviewMode
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
            }`}
            title={isPreviewMode ? 'Переключиться в режим ввода текста' : 'Посмотреть форматирование и маркеры'}
          >
            {isPreviewMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPreviewMode ? 'Редактировать' : 'Красивый вид'}</span>
          </button>
        </div>
      </div>

      {/* ACTIVE VOICE DICTATION DOCKED BANNER (Web Speech API) */}
      {isListening && (
        <div className="mx-2.5 sm:mx-3 mt-1.5 p-2 sm:p-2.5 rounded-2xl bg-rose-50/95 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-600 shadow-md animate-in fade-in shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  🎙️ Диктовка голосом
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-200/80 dark:bg-rose-900/80 text-rose-900 dark:text-rose-100 font-mono font-bold">
                  REC
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Smart punctuation toggle */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setUseSmartPunctuation(!useSmartPunctuation);
                }}
                className={`text-[10px] px-2 py-0.5 rounded-lg border transition font-medium cursor-pointer ${
                  useSmartPunctuation
                    ? 'bg-rose-100 dark:bg-rose-900/80 border-rose-300 dark:border-rose-600 text-rose-800 dark:text-rose-200'
                    : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
                }`}
                title="Автоматически заменять слова 'точка', 'запятая', 'новая строка' на знаки препинания"
              >
                Пунктуация: {useSmartPunctuation ? 'ВКЛ' : 'ВЫКЛ'}
              </button>

              {/* Stop button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  stopListening();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                title="Остановить запись голоса"
              >
                <Square className="w-3 h-3 fill-white" />
                <span>Завершить</span>
              </button>
            </div>
          </div>

          {/* Real-time recognized speech preview */}
          <div className="mt-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-stone-900/90 border border-rose-200 dark:border-rose-800/60 text-xs font-mono min-h-[32px] flex items-center">
            {interimTranscript ? (
              <span className="text-stone-900 dark:text-stone-100 italic">
                «{interimTranscript}»
              </span>
            ) : (
              <span className="text-stone-400 dark:text-stone-500">
                Говорите в микрофон, текст печатается прямо в тетрадь...
              </span>
            )}
          </div>

          {/* Quick Voice Punctuation & Snippets Chips */}
          <div className="mt-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 text-[11px]">
            <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase shrink-0 mr-0.5">
              Вставить:
            </span>
            <button
              type="button"
              onClick={() => insertTextAtCursor('\n')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-mono cursor-pointer shrink-0"
            >
              ↵ Новая строка
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor(', ')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-mono cursor-pointer shrink-0"
            >
              , Запятая
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('. ')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-mono cursor-pointer shrink-0"
            >
              . Точка
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor('? ')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-mono cursor-pointer shrink-0"
            >
              ? Вопрос
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor(': ')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-mono cursor-pointer shrink-0"
            >
              : Двоеточие
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor(' — ')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-mono cursor-pointer shrink-0"
            >
              — Тире
            </button>
            <button
              type="button"
              onClick={() => insertTextAtCursor(' руб')}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-mono cursor-pointer shrink-0"
            >
              ₽ руб
            </button>
          </div>
        </div>
      )}

      {/* Voice Error Banner */}
      {speechError && (
        <div className="mx-2.5 sm:mx-3 mt-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2 shadow-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <MicOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={clearSpeechError}
            className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* НАСТОЯЩИЙ ЛИСТ БУМАГИ С ПОЛЯМИ, ПЕРФОРАЦИЕЙ И СПИРАЛЬЮ */}
      <div className="flex-1 flex overflow-hidden relative m-2.5 sm:m-3 rounded-2xl border border-amber-900/15 dark:border-stone-700/80 notebook-paper-shadow page-dog-ear">
        {/* Notebook Spiral Left Border (Реалистичные кольца тетради) */}
        <div className="w-3.5 sm:w-4 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 border-r border-amber-300/60 dark:border-stone-700/80 flex flex-col justify-around py-3 shrink-0 select-none">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className="w-2 sm:w-2.5 h-1 sm:h-1.5 bg-amber-500/70 dark:bg-stone-400/80 rounded-full mx-auto shadow-inner border border-amber-700/50 dark:border-stone-600"
            />
          ))}
        </div>

        {/* Notebook Sheet Body with selected Paper Style and Red Margins (at 56px) */}
        <div className={`flex-1 flex overflow-hidden relative p-0 gap-1 ${paperClass} notebook-margin-red text-stone-900 dark:text-stone-100`}>
          {/* Main Textarea aligned on paper lines/grid strictly to the right of red margin (pl-16 = 64px) */}
          <div className="flex-1 h-full relative pl-16 pr-2 sm:pr-3 overflow-hidden">
            {isPreviewMode ? (
              <div
                className="w-full h-full overflow-y-auto font-mono text-sm leading-[28px] selectable-text text-stone-900 dark:text-stone-100 pt-[14px]"
                style={{ lineHeight: '28px', fontSize: '15px' }}
              >
                {content.split('\n').map((line, idx) => {
                  let html = line
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u class="underline decoration-stone-600 dark:decoration-stone-300 underline-offset-2">$1</u>')
                    .replace(/&lt;mark class="marker-yellow"&gt;(.*?)&lt;\/mark&gt;/gi, '<mark class="marker-yellow">$1</mark>')
                    .replace(/&lt;mark class="marker-green"&gt;(.*?)&lt;\/mark&gt;/gi, '<mark class="marker-green">$1</mark>')
                    .replace(/&lt;mark class="marker-pink"&gt;(.*?)&lt;\/mark&gt;/gi, '<mark class="marker-pink">$1</mark>')
                    .replace(/&lt;mark class="marker-blue"&gt;(.*?)&lt;\/mark&gt;/gi, '<mark class="marker-blue">$1</mark>')
                    .replace(/&lt;mark class="marker-orange"&gt;(.*?)&lt;\/mark&gt;/gi, '<mark class="marker-orange">$1</mark>')
                    .replace(/&lt;mark class="marker-purple"&gt;(.*?)&lt;\/mark&gt;/gi, '<mark class="marker-purple">$1</mark>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-stone-950 dark:text-white">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                    .replace(/^- \[ \]/g, '⬜ ')
                    .replace(/^- \[x\]/gi, '✅ ');

                  return (
                    <div
                      key={idx}
                      className="h-[28px] leading-[28px] truncate"
                      dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }}
                    />
                  );
                })}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  category === 'payment'
                    ? `Учет финансов в тетрадке:\n=== Доходы ===\n+ Зарплата: 95 000 руб\n+ Премия: 15 000\n\n=== Расходы ===\n- Аренда: 35 000 руб\n- Продукты: 18 500\n- Коммуналка: 4 500\n\nОстаток в итоге:`
                    : category === 'shopping'
                    ? `Список продуктов в тетрадке:\n- [ ] Молоко 3.2% 2 л\n- [ ] Сыр 400 г\n- [ ] Хлеб 1 шт\n- [ ] Кофе 1 пачка`
                    : category === 'event'
                    ? `План события в тетради:\n14:00 — Встреча с коллегами\nКофе-брейк: 450 * 4\nПодготовить отчет и слайды`
                    : `Заметки в тетрадке и быстрый расчет:\nАренда: 35000 руб\nСвет + вода: 2400 + 1350\nОбед: 450 * 2\nИтого к оплате:`
                }
                style={{
                  lineHeight: '28px',
                  fontSize: '15px',
                  paddingTop: '14px',
                }}
                className="w-full h-full bg-transparent resize-none focus:outline-none font-mono text-sm selectable-text text-stone-900 dark:text-stone-100 placeholder-stone-500/70 dark:placeholder-stone-400 font-medium overflow-y-auto"
              />
            )}
          </div>

          {/* Live Math Results Margin (aligned exactly to 28px lines) */}
          {mathSummary.totalCalculatedLines > 0 && (
            <div className="w-28 sm:w-36 h-full overflow-y-auto pl-2 border-l border-amber-900/15 dark:border-stone-700/60 flex flex-col font-mono text-xs select-none shrink-0 pt-[14px]">
              <div className="space-y-0">
                {mathSummary.lines.map((line, idx) => (
                  <div key={idx} className="h-[28px] flex items-center justify-end leading-[28px]">
                    {line.result !== null ? (
                      <button
                        onClick={() => handleCopyResult(line.result!, line.currency)}
                        className={`group/res flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-bold text-xs transition active:scale-95 shadow-2xs cursor-pointer ${
                          line.isTotalLine
                            ? 'bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-950 dark:bg-amber-600/40 dark:text-amber-200'
                            : line.type === 'income'
                            ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-400 text-emerald-950 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-950 dark:bg-rose-950/60 dark:text-rose-200'
                        }`}
                        title={line.isTotalLine ? 'Итоговая строка' : `Тип: ${line.type === 'income' ? 'Прибыль' : 'Расход'}`}
                      >
                        <span>
                          {line.isTotalLine
                            ? `= ${formatMoney(line.result, line.currency)}`
                            : line.type === 'income'
                            ? `+${formatMoney(line.result, line.currency)}`
                            : `−${formatMoney(line.result, line.currency)}`}
                        </span>
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

      {/* Floating Cashflow / Grand Total Bar (Supports money ₽ and pieces шт.) */}
      {(mathSummary.totalCalculatedLines > 0 || (mathSummary.totalPieces || 0) > 0) && (
        <div className="mx-3 sm:mx-4 mb-2 bg-white/95 dark:bg-stone-900/95 border border-amber-900/15 dark:border-stone-800 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-stone-600 dark:text-stone-400 uppercase font-bold tracking-wide">
                {mathSummary.currency === 'шт.' || (mathSummary.grandTotal === 0 && (mathSummary.totalPieces || 0) > 0)
                  ? 'Итого количество:'
                  : mathSummary.hasIncomeExpenseSplit
                  ? 'Остаток в итоге:'
                  : 'Итого к оплате:'}
              </span>
              <div className="text-base sm:text-lg font-bold text-stone-900 dark:text-white font-mono leading-none">
                {mathSummary.currency === 'шт.' || (mathSummary.grandTotal === 0 && (mathSummary.totalPieces || 0) > 0)
                  ? `${mathSummary.totalPieces || 0} шт.`
                  : (mathSummary.totalPieces || 0) > 0
                  ? `${formatMoney(mathSummary.grandTotal, mathSummary.currency)} | ${mathSummary.totalPieces} шт.`
                  : formatMoney(mathSummary.grandTotal, mathSummary.currency)}
              </div>
            </div>
          </div>

          <button
            onClick={handleInsertGrandTotal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition active:scale-95 shadow cursor-pointer shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Вставить в тетрадь</span>
          </button>
        </div>
      )}

      {/* Quick Keypad Toolbar: Math + Income/Expense Presets + Pieces + Voice */}
      <div className="px-3 py-2 bg-stone-100/90 dark:bg-stone-900 border-t border-amber-900/10 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            if (!isSpeechSupported) {
              setCopiedText('Голосовой ввод не поддерживается браузером');
              setTimeout(() => setCopiedText(null), 2500);
              return;
            }
            toggleListening();
          }}
          className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold whitespace-nowrap active:scale-95 transition border shadow-2xs cursor-pointer flex items-center gap-1 shrink-0 ${
            isListening
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
              : 'bg-rose-50 hover:bg-rose-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-stone-700'
          }`}
          title={isListening ? 'Остановить запись голоса' : 'Диктовать заметку голосом'}
        >
          <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce text-white' : 'text-rose-500'}`} />
          <span>{isListening ? 'Слушаю...' : '🎙️ Диктовка'}</span>
        </button>

        {[
          { label: '🟢 + Доход', insert: '\n+ Зарплата: 50 000 руб' },
          { label: '🔴 - Расход', insert: '\n- Трата: 2 500 руб' },
          { label: '💰 Остаток:', insert: '\n\nОстаток в итоге: ' },
          { label: '+', insert: ' + ' },
          { label: '-', insert: ' - ' },
          { label: '×', insert: ' * ' },
          { label: '÷', insert: ' / ' },
          { label: '%', insert: '%' },
          { label: '-10%', insert: ' - 10%' },
          { label: '₽', insert: ' руб' },
          { label: '📦 шт.', insert: ' шт' },
          { label: 'к', insert: 'к' },
          { label: '- [ ] Чекбокс', insert: '\n- [ ] ' },
          { label: '• Список', insert: '\n• ' },
          { label: '⏰ Время', insert: ` ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ` },
        ].map((btn, idx) => (
          <button
            key={idx}
            onClick={() => insertTextAtCursor(btn.insert)}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-xs font-semibold whitespace-nowrap active:scale-95 transition border border-stone-200 dark:border-stone-700/60 shadow-2xs cursor-pointer"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Social Media Share Modal */}
      <ShareNoteModal
        note={{
          ...note,
          title,
          content,
          tags,
          cachedTotal: mathSummary.grandTotal,
          currency: mathSummary.currency,
          cachedPieces: mathSummary.totalPieces,
        }}
        isOpen={isSocialShareOpen}
        onClose={() => setIsSocialShareOpen(false)}
      />
    </div>
  );
};
