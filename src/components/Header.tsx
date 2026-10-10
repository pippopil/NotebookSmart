import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { SyncStatus } from '../types';
import { Cloud, CloudOff, RefreshCw, Github, Sparkles, WifiOff } from 'lucide-react';

import { APP_VERSION } from '../version';

interface HeaderProps {
  syncStatus: SyncStatus;
  isOnline: boolean;
  onOpenSync: () => void;
  onOpenChangelog?: () => void;
  onOpenSearch?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  syncStatus,
  isOnline,
  onOpenSync,
  onOpenChangelog,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 safe-top">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">NotebookSmart</span>
              <button
                onClick={onOpenChangelog}
                className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition active:scale-95 cursor-pointer flex items-center gap-1"
                title="Что нового? История версий"
              >
                <span>v{APP_VERSION}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">
              Умные оплаты & Покупки
            </p>
          </div>
        </div>

        {/* Right tools: Sync badge, PWA Install, GitHub */}
        <div className="flex items-center gap-2">
          {/* Offline notice */}
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px]">
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">Офлайн</span>
            </div>
          )}

          {/* Sync status button */}
          <button
            onClick={onOpenSync}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition active:scale-95"
            title="Синхронизация Firebase & GitHub Actions"
          >
            {syncStatus.isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-300 hidden sm:inline">Синхрон</span>
              </>
            ) : syncStatus.isConfigured ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                <span className="text-[11px] text-blue-300 hidden sm:inline">Подключение</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-400 hidden sm:inline">Firebase</span>
              </>
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton compact />

          {/* GitHub Action repo link button */}
          <a
            href="https://github.com/pippopil/NotebookSmart"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
            title="GitHub: pippopil/NotebookSmart"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Quick Search bar */}
      <div className="max-w-4xl mx-auto mt-2.5">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по заметкам, товарам или суммам..."
            className="w-full bg-slate-900/90 text-sm text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-1.5 pl-9 border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          <svg
            className="w-4 h-4 text-slate-500 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-full w-4 h-4 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
