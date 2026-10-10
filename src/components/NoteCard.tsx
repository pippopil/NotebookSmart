import React from 'react';
import { Note } from '../types';
import { formatMoney } from '../utils/mathEngine';
import { Pin, ShoppingCart, Calculator, Tag, ArrowRight } from 'lucide-react';

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
  const hasShopping = (note.shoppingItemsCount || 0) > 0;
  const shoppingDone = note.completedItemsCount || 0;
  const shoppingTotal = note.shoppingItemsCount || 0;
  const shoppingProgress = shoppingTotal > 0 ? (shoppingDone / shoppingTotal) * 100 : 0;

  const dateStr = new Date(note.updatedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onClick={() => onOpen(note)}
      className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-base text-white group-hover:text-indigo-300 transition line-clamp-1">
          {note.title || 'Новая заметка'}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note.id);
          }}
          className={`p-1 rounded-lg transition ${
            note.isPinned
              ? 'text-amber-400 bg-amber-400/10'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title={note.isPinned ? 'Открепить' : 'Закрепить сверху'}
        >
          <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      {/* Snippet */}
      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
        {note.content || 'Пустая заметка...'}
      </p>

      {/* Smart indicators: Payment sum & Shopping list */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {hasPayments && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
            <Calculator className="w-3.5 h-3.5" />
            <span>Итого: {formatMoney(note.cachedTotal!, note.currency)}</span>
          </div>
        )}

        {hasShopping && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenShopping(note);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-medium transition"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Покупки: {shoppingDone}/{shoppingTotal}
            </span>
            <ArrowRight className="w-3 h-3 text-indigo-400" />
          </button>
        )}
      </div>

      {/* Shopping progress bar if present */}
      {hasShopping && (
        <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${shoppingProgress}%` }}
          />
        </div>
      )}

      {/* Footer tags and date */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/50">
        <div className="flex items-center gap-1.5 line-clamp-1">
          {note.tags && note.tags.length > 0 ? (
            note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))
          ) : (
            <span className="capitalize">{note.category}</span>
          )}
        </div>
        <span>{dateStr}</span>
      </div>
    </div>
  );
};
