import React from 'react';
import { Note } from '../types';
import { formatMoney } from '../utils/mathEngine';
import {
  Pin,
  ShoppingCart,
  Calculator,
  Calendar,
  FileText,
  Tag,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onOpen: (note: Note) => void;
  onTogglePin: (noteId: string) => void;
  onOpenShopping: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onOpen,
  onTogglePin,
  onOpenShopping,
}) => {
  const hasPayments = note.cachedTotal !== undefined && note.cachedTotal > 0;
  const isShopping = note.category === 'shopping' || (note.shoppingItemsCount || 0) > 0;
  const isEvent = note.category === 'event';

  const shoppingDone = note.completedItemsCount || 0;
  const shoppingTotal = note.shoppingItemsCount || 0;
  const shoppingProgress = shoppingTotal > 0 ? (shoppingDone / shoppingTotal) * 100 : 0;

  const dateStr = new Date(note.updatedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Category badge metadata
  const categoryConfig = {
    note: {
      label: 'Просто заметка',
      icon: FileText,
      bgColor: 'bg-blue-50 dark:bg-blue-500/15',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-500/30',
    },
    shopping: {
      label: 'Покупки',
      icon: ShoppingCart,
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/15',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30',
    },
    event: {
      label: 'Событие',
      icon: Calendar,
      bgColor: 'bg-purple-50 dark:bg-purple-500/15',
      textColor: 'text-purple-700 dark:text-purple-300',
      borderColor: 'border-purple-200 dark:border-purple-500/30',
    },
    payment: {
      label: 'Оплаты',
      icon: Calculator,
      bgColor: 'bg-amber-50 dark:bg-amber-500/15',
      textColor: 'text-amber-800 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-500/30',
    },
    general: {
      label: 'Заметка',
      icon: FileText,
      bgColor: 'bg-stone-100 dark:bg-stone-500/15',
      textColor: 'text-stone-700 dark:text-stone-300',
      borderColor: 'border-stone-200 dark:border-stone-500/30',
    },
    budget: {
      label: 'Бюджет',
      icon: Calculator,
      bgColor: 'bg-amber-50 dark:bg-amber-500/15',
      textColor: 'text-amber-800 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-500/30',
    },
  }[note.category] || {
    label: 'Заметка',
    icon: FileText,
    bgColor: 'bg-stone-100 dark:bg-stone-500/15',
    textColor: 'text-stone-700 dark:text-stone-300',
    borderColor: 'border-stone-200 dark:border-stone-500/30',
  };

  const CatIcon = categoryConfig.icon;

  return (
    <div
      onClick={() => onOpen(note)}
      className="group relative notebook-grid-warm rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md border border-amber-900/10 dark:border-stone-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 overflow-hidden"
    >
      {/* Тетрадный переплет: левая полоса с полями и спиралью */}
      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-amber-100 via-amber-200 to-amber-100 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 border-r border-amber-300/40 dark:border-stone-700/80" />
      {/* Красные поля школьной тетради */}
      <div className="absolute left-6 top-0 bottom-0 w-[1.5px] bg-rose-500/50 dark:bg-rose-500/40 pointer-events-none" />

      {/* Main card body with indent for notebook margins */}
      <div className="pl-6">
        {/* Header row: Category Pill + Title + Pin */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${categoryConfig.bgColor} ${categoryConfig.textColor} ${categoryConfig.borderColor}`}
            >
              <CatIcon className="w-3 h-3" />
              <span>{categoryConfig.label}</span>
            </span>

            {/* Event date badge if set */}
            {isEvent && (note.eventDate || note.eventTime) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                <Clock className="w-3 h-3" />
                <span>
                  {note.eventDate ? new Date(note.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}
                  {note.eventTime ? ` в ${note.eventTime}` : ''}
                </span>
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id);
            }}
            className={`p-1 rounded-lg transition ${
              note.isPinned
                ? 'text-amber-500 bg-amber-400/15'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title={note.isPinned ? 'Открепить' : 'Закрепить сверху'}
          >
            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-500' : ''}`} />
          </button>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition line-clamp-1 mb-1">
          {note.title || 'Новая запись в тетради'}
        </h3>

        {/* Snippet on graph paper */}
        <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed mb-3 font-mono opacity-90">
          {note.content || 'Пустая страница в клетку...'}
        </p>

        {/* Smart indicators: Payment sum & Shopping list */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {hasPayments && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-bold shadow-2xs">
              <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Итого: {formatMoney(note.cachedTotal!, note.currency)}</span>
            </div>
          )}

          {isShopping && shoppingTotal > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenShopping(note);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium transition cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                Куплено: {shoppingDone}/{shoppingTotal}
              </span>
              <ArrowRight className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            </button>
          )}

          {isEvent && (
            <div className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
              <CheckCircle2 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span>{note.isEventDone ? 'Завершено' : 'Запланировано'}</span>
            </div>
          )}
        </div>

        {/* Shopping progress bar */}
        {isShopping && shoppingTotal > 0 && (
          <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${shoppingProgress}%` }}
            />
          </div>
        )}

        {/* Footer tags and date */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-2 border-t border-amber-900/10 dark:border-stone-800/80 font-mono">
          <div className="flex items-center gap-1.5 line-clamp-1">
            {note.tags && note.tags.length > 0 ? (
              note.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))
            ) : (
              <span className="capitalize">{categoryConfig.label}</span>
            )}
          </div>
          <span>{dateStr}</span>
        </div>
      </div>
    </div>
  );
};
