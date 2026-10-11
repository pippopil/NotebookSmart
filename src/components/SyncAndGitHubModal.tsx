import React, { useState } from 'react';
import { SyncStatus, FirebaseConfig, Note } from '../types';
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  getSyncRoomCode,
  setSyncRoomCode,
  initFirebase,
} from '../services/firebase';
import {
  Cloud,
  Check,
  Github,
  QrCode,
  Smartphone,
  Download,
  Upload,
  RefreshCw,
  Copy,
  ExternalLink,
  Code,
  Layers,
  Terminal,
  Sparkles,
  Calendar,
  Zap,
} from 'lucide-react';
import { RELEASES_HISTORY, APP_VERSION } from '../version';

interface SyncAndGitHubModalProps {
  syncStatus: SyncStatus;
  notes: Note[];
  onImportNotes: (notes: Note[]) => void;
  onRefreshSync: () => void;
  onClose?: () => void;
}

export const SyncAndGitHubModal: React.FC<SyncAndGitHubModalProps> = ({
  syncStatus,
  notes,
  onImportNotes,
  onRefreshSync,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sync' | 'github' | 'releases' | 'backup'>('sync');
  const [roomCode, setRoomCode] = useState<string>(getSyncRoomCode());
  const [copiedCode, setCopiedCode] = useState(false);
  const [firebaseProject, setFirebaseProject] = useState(
    getSavedFirebaseConfig()?.projectId || ''
  );
  const [firebaseApiKey, setFirebaseApiKey] = useState(
    getSavedFirebaseConfig()?.apiKey || ''
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveFirebase = () => {
    if (!firebaseProject) return;
    const cfg: FirebaseConfig = {
      projectId: firebaseProject.trim(),
      apiKey: firebaseApiKey.trim() || 'AIzaSyDemoKey',
      authDomain: `${firebaseProject.trim()}.firebaseapp.com`,
    };
    saveFirebaseConfig(cfg);
    initFirebase(cfg);
    setSaveSuccess(true);
    onRefreshSync();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleUpdateRoom = (newCode: string) => {
    setRoomCode(newCode);
    setSyncRoomCode(newCode);
    onRefreshSync();
  };

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Export JSON backup
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `notebook_smart_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportNotes(parsed);
            alert(`Успешно импортировано ${parsed.length} заметок!`);
          }
        } catch {
          alert('Ошибка при чтении файла JSON');
        }
      };
    }
  };

  // Generate web app pairing link
  const pairingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${encodeURIComponent(roomCode)}`
    : `https://notebooksmart.app?room=${encodeURIComponent(roomCode)}`;

  // SVG QR Code generator representation
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    pairingUrl
  )}&color=ffffff&bgcolor=090d16`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Cloud className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Синхронизация & GitHub Actions
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Синхронизация заметок через Firebase и сборка Android/PWA для pippopil/NotebookSmart
            </p>
          </div>

          <a
            href="https://github.com/pippopil/NotebookSmart"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95 shrink-0"
          >
            <Github className="w-4 h-4" />
            <span>pippopil/NotebookSmart</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={() => setActiveSubTab('sync')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'sync'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            ☁️ Firebase & Мульти-девайс
          </button>
          <button
            onClick={() => setActiveSubTab('github')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'github'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            🚀 GitHub Actions & Android
          </button>
          <button
            onClick={() => setActiveSubTab('releases')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'releases'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Релизы & Чейнджлог
          </button>
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'backup'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            💾 Резервная копия (JSON)
          </button>
        </div>
      </div>

      {/* SUBTAB 1: FIREBASE & MULTI-DEVICE SYNC */}
      {activeSubTab === 'sync' && (
        <div className="space-y-5">
          {/* Room pairing card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <h3 className="font-bold text-base text-white mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>Быстрая связь устройств (Код комнаты)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Откройте NotebookSmart на телефоне, планшете или ноутбуке с этим кодом — все заметки и списки покупок синхронизируются мгновенно!
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {/* QR Code */}
              <div className="p-2 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center shrink-0">
                <img
                  src={qrCodeUrl}
                  alt="QR код для синхронизации"
                  className="w-36 h-36 rounded-lg"
                />
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <QrCode className="w-3 h-3" />
                  Сканируйте камерой телефона
                </span>
              </div>

              {/* Room Code tools */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                    Код синхронизации (Room ID):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => handleUpdateRoom(e.target.value)}
                      className="bg-slate-900 text-indigo-300 font-mono text-base font-bold px-3 py-2 rounded-xl border border-slate-700 w-full focus:outline-none focus:border-indigo-500 uppercase"
                    />
                    <button
                      onClick={handleCopyRoom}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0"
                      title="Скопировать"
                    >
                      {copiedCode ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      const newCode = `ROOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                      handleUpdateRoom(newCode);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Сгенерировать новый код</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Firebase Custom Credentials configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <h3 className="font-bold text-base text-white mb-2 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Параметры Firebase Firestore</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Вы можете подключить свой проект Firebase (Firebase Console → Project Settings).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Firebase Project ID:
                </label>
                <input
                  type="text"
                  value={firebaseProject}
                  onChange={(e) => setFirebaseProject(e.target.value)}
                  placeholder="e.g. notebook-smart-demo"
                  className="w-full bg-slate-950 text-xs text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Firebase Web API Key:
                </label>
                <input
                  type="text"
                  value={firebaseApiKey}
                  onChange={(e) => setFirebaseApiKey(e.target.value)}
                  placeholder="e.g. AIzaSy..."
                  className="w-full bg-slate-950 text-xs text-slate-200 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSaveFirebase}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить и подключить</span>
                </button>

                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Настройки сохранены!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: GITHUB ACTIONS & ANDROID BUILD */}
      {activeSubTab === 'github' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Github className="w-5 h-5 text-white" />
              <h3 className="font-bold text-base text-white">
                GitHub Action: Автоматическая сборка для Android & PWA
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              В проекте уже настроен файл рабочего процесса <code>.github/workflows/android-build.yml</code>. При каждом пуше в ветку <code>main</code> репозитория <a href="https://github.com/pippopil/NotebookSmart" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">https://github.com/pippopil/NotebookSmart</a> GitHub Actions автоматически собирает Android APK и PWA артефакты!
            </p>

            {/* Workflow preview */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
              <div className="flex items-center justify-between text-slate-500 mb-2 pb-2 border-b border-slate-800 text-[11px]">
                <span className="flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-indigo-400" />
                  .github/workflows/android-build.yml
                </span>
                <span className="text-emerald-400">CI/CD Ready</span>
              </div>
              <pre className="text-slate-300 leading-5">
{`name: Build NotebookSmart Android & PWA
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install Dependencies
        run: npm ci || npm install
      - name: Build PWA Web Assets
        run: npm run build
      - name: Upload PWA Production Build
        uses: actions/upload-artifact@v4
        with:
          name: notebook-smart-pwa-dist
          path: dist/`}
              </pre>
            </div>

            {/* Quick steps & APK Download */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>📦 Скачать готовый APK файл для Android</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                      Release APK
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Файл APK автоматически собирается Gradle в GitHub Actions и прикрепляется к каждому релизу
                  </p>
                </div>

                <a
                  href="https://github.com/pippopil/NotebookSmart/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow flex items-center gap-1 shrink-0 self-start sm:self-auto"
                >
                  <span>Скачать APK</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Как устроена сборка в репозитории:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                <li>Откройте вкладку <strong>Actions</strong> в <a href="https://github.com/pippopil/NotebookSmart/actions" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">pippopil/NotebookSmart</a>.</li>
                <li>При каждом коммите запускается <strong>Build NotebookSmart Android APK & PWA</strong>.</li>
                <li>Gradle компилирует <strong>NotebookSmart-debug.apk</strong> и загружает его в раздел <strong>Artifacts</strong>.</li>
                <li>При публикации тегов и релизов workflow <strong>Automatic GitHub Release with Android APK</strong> автоматически создает релиз с прикрепленным файлом <code>.apk</code>!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: RELEASES & CHANGELOG */}
      {activeSubTab === 'releases' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base text-white">
                    Постоянно обновляемые релизы
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                    v{APP_VERSION}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Каждый релиз содержит номер версии, дату и подробное описание изменений
                </p>
              </div>

              <a
                href="https://github.com/pippopil/NotebookSmart/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Релизы на GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-4">
              {RELEASES_HISTORY.map((rel) => (
                <div
                  key={rel.version}
                  className={`p-4 rounded-2xl border transition ${
                    rel.isLatest
                      ? 'bg-slate-950 border-indigo-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-white">
                        v{rel.version}
                      </span>
                      {rel.isLatest && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          Текущий релиз
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {rel.releaseDate}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-indigo-300 mb-2">
                    {rel.title}
                  </h4>

                  {/* Highlights */}
                  <div className="space-y-1 mb-3">
                    {rel.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-200">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  {/* Categories */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    {rel.categories.map((cat, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium text-slate-300 block mb-1">{cat.name}:</span>
                        <ul className="space-y-0.5 pl-2 text-slate-400">
                          {cat.items.map((it, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-1.5">
                              <span className="text-indigo-400 font-bold">•</span>
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: BACKUP & RESTORE */}
      {activeSubTab === 'backup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <h3 className="font-bold text-base text-white mb-2 flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Резервная копия данных</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Выгрузите все свои умные заметки, расчеты оплат и списки покупок в файл JSON или восстановите их на новом устройстве.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-white mb-1">Экспорт заметок</h4>
                <p className="text-xs text-slate-400 mb-4">
                  Сохранить все {notes.length} заметок в локальный файл JSON
                </p>
              </div>
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Скачать резервную копию JSON</span>
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-white mb-1">Импорт заметок</h4>
                <p className="text-xs text-slate-400 mb-4">
                  Загрузить заметки из ранее сохраненного файла JSON
                </p>
              </div>
              <label className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer active:scale-95">
                <Upload className="w-4 h-4" />
                <span>Выбрать файл JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
