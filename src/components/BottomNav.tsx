import React from 'react';
import { FileText, ShoppingCart, Calculator, Cloud, Plus } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'notes' | 'shopping' | 'calc' | 'sync';
  onTabChange: (tab: 'notes' | 'shopping' | 'calc' | 'sync') => void;
  onNewNote: () => void;
  pendingShoppingCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onNewNote,
  pendingShoppingCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 safe-bottom">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between relative">
        {/* Notes tab */}
        <button
          onClick={() => onTabChange('notes')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'notes' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Заметки</span>
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
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow">
                {pendingShoppingCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">Покупки</span>
        </button>

        {/* Center Big Add Button */}
        <div className="relative -top-5">
          <button
            onClick={onNewNote}
            className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition"
            title="Создать умную заметку"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Calculator / Payments tab */}
        <button
          onClick={() => onTabChange('calc')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'calc' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Calculator className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Оплаты</span>
        </button>

        {/* Sync & GitHub tab */}
        <button
          onClick={() => onTabChange('sync')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'sync' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Cloud className="w-5 h-5" />
          </div>
          <span className="text-[11px]">Синхрон</span>
        </button>
      </div>
    </nav>
  );
};
