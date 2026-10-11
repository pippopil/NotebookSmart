import React, { useState } from 'react';
import { APP_VERSION, APP_RELEASE_DATE, RELEASES_HISTORY } from '../version';
import {
  Sparkles,
  X,
  Tag,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Github,
  Zap,
} from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const [expandedVersion, setExpandedVersion] = useState<string>(APP_VERSION);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setUpdateMsg(null);
    setTimeout(() => {
      setCheckingUpdate(false);
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.update());
        });
      }
      setUpdateMsg('У вас установлена самая актуальная версия v' + APP_VERSION);
      setTimeout(() => setUpdateMsg(null), 4000);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 safe-top safe-bottom">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">История обновлений</h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Что изменилось и добавлено в каждом релизе
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status banner */}
        <div className="px-5 py-3 bg-indigo-950/40 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">
              Текущая версия: <strong className="text-white">v{APP_VERSION}</strong> ({APP_RELEASE_DATE})
            </span>
          </div>

          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? 'Проверка...' : 'Обновить'}</span>
          </button>
        </div>

        {updateMsg && (
          <div className="px-5 py-2 bg-emerald-500/20 text-emerald-300 text-xs font-medium text-center border-b border-emerald-500/30 shrink-0 animate-in fade-in">
            {updateMsg}
          </div>
        )}

        {/* Scrollable List of Releases */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {RELEASES_HISTORY.map((rel) => {
            const isExpanded = expandedVersion === rel.version;

            return (
              <div
                key={rel.version}
                className={`rounded-2xl border transition overflow-hidden ${
                  rel.isLatest
                    ? 'bg-slate-950/80 border-indigo-500/40 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                {/* Release header item */}
                <div
                  onClick={() => setExpandedVersion(isExpanded ? '' : rel.version)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-white">
                          v{rel.version}
                        </span>
                        {rel.isLatest && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                            Актуальный релиз
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {rel.releaseDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-xs hidden sm:inline text-slate-500 font-medium">
                      {rel.title}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Highlights and details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-4 bg-slate-900/40">
                    {/* Title */}
                    <h4 className="text-sm font-semibold text-indigo-300">
                      {rel.title}
                    </h4>

                    {/* Quick highlights */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Главное в обновлении:
                      </span>
                      {rel.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>

                    {/* Detailed categorized items */}
                    <div className="space-y-3">
                      {rel.categories.map((cat, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <span className="text-xs font-semibold text-slate-300 block">
                            {cat.name}
                          </span>
                          <ul className="space-y-1 pl-1">
                            {cat.items.map((it, itemIdx) => (
                              <li
                                key={itemIdx}
                                className="text-xs text-slate-400 flex items-start gap-2"
                              >
                                <span className="text-indigo-400 font-bold shrink-0">•</span>
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with GitHub Releases link & APK Download */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <a
              href="https://github.com/pippopil/NotebookSmart/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition active:scale-95"
            >
              <span>📦 Скачать APK (Android)</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://github.com/pippopil/NotebookSmart/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition hidden sm:inline-flex"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Релизы на GitHub</span>
            </a>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
