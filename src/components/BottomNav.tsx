import React, { useState } from 'react';
import { FileText, ShoppingCart, Calendar, Calculator, Cloud, Plus, X } from 'lucide-react';
import { NoteCategory } from '../types';

interface BottomNavProps {
  activeTab: 'notes' | 'shopping' | 'events' | 'calc' | 'sync';
  onTabChange: (tab: 'notes' | 'shopping' | 'events' | 'calc' | 'sync') => void;
  onNewNote: (category: NoteCategory) => void;
  pendingShoppingCount: number;
  upcomingEventsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onNewNote,
  pendingShoppingCount,
  upcomingEventsCount = 0,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  const handleCreateCategory = (cat: NoteCategory) => {
    triggerHaptic();
    setShowQuickMenu(false);
    onNewNote(cat);
  };

  return (
    <>
      {/* Quick Add Popover Menu */}
      {showQuickMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center pb-24 px-4"
          onClick={() => setShowQuickMenu(false)}
        >
          <div
            className="w-full max-w-xs bg-slate-900 border border-slate-700/80 rounded-3xl p-4 shadow-2xl space-y-2 text-slate-100 animate-in fade-in slide-in-from-bottom-5 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Создать в тетради
              </span>
              <button
                onClick={() => setShowQuickMenu(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => handleCreateCategory('note')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition active:scale-98"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Просто заметка</span>
                <span className="text-[11px] text-slate-400">Мысли, текст и расчет оплат</span>
              </div>
            </button>

            <button
              onClick={() => handleCreateCategory('shopping')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition active:scale-98"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Список покупок</span>
                <span className="text-[11px] text-slate-400">Корзина маркетплейсов & доставка</span>
              </div>
            </button>

            <button
              onClick={() => handleCreateCategory('event')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition active:scale-98"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Событие</span>
                <span className="text-[11px] text-slate-400">Встречи, даты и планы</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 safe-bottom">
        <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-between relative">
          {/* Notes tab */}
          <button
            onClick={() => onTabChange('notes')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'notes' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px]">Заметки</span>
          </button>

          {/* Shopping tab */}
          <button
            onClick={() => onTabChange('shopping')}
            className={`flex flex-col items-center gap-1 transition relative ${
              activeTab === 'shopping' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {pendingShoppingCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[15px] text-center shadow">
                  {pendingShoppingCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">Покупки</span>
          </button>

          {/* Center Big Add Button */}
          <div className="relative -top-5">
            <button
              onClick={() => {
                triggerHaptic();
                setShowQuickMenu(!showQuickMenu);
              }}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition"
              title="Создать запись в тетради"
            >
              <Plus className={`w-7 h-7 stroke-[2.5] transition-transform ${showQuickMenu ? 'rotate-45' : ''}`} />
            </button>
          </div>

          {/* Events tab */}
          <button
            onClick={() => onTabChange('events')}
            className={`flex flex-col items-center gap-1 transition relative ${
              activeTab === 'events' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Calendar className="w-5 h-5" />
              {upcomingEventsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[15px] text-center shadow">
                  {upcomingEventsCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">События</span>
          </button>

          {/* Calculator / Payments tab */}
          <button
            onClick={() => onTabChange('calc')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'calc' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span className="text-[10px]">Оплаты</span>
          </button>
        </div>
      </nav>
    </>
  );
};
