import React, { useState, useEffect } from 'react';
import { Note, ShoppingItem, NearbyStore } from '../types';
import {
  STORE_OPTIONS,
  CATEGORY_META,
  getItemStoreUrl,
  extractShoppingItems,
  formatShoppingListForSharing,
} from '../utils/shoppingParser';
import {
  getNearbyStores,
  reverseGeocodeCoords,
  MAJOR_CITIES,
  LocationInfo,
} from '../utils/geoStores';
import confetti from 'canvas-confetti';
import {
  ShoppingCart,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Circle,
  Share2,
  Navigation,
  Clock,
  Check,
  Store,
  Compass,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';

interface ShoppingViewProps {
  note?: Note | null;
  allNotes: Note[];
  onUpdateNote?: (note: Note) => void;
  onClose?: () => void;
}

export const ShoppingView: React.FC<ShoppingViewProps> = ({
  note,
  allNotes,
  onUpdateNote,
  onClose,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string>(note?.id || '');
  const [shoppingMode, setShoppingMode] = useState<boolean>(false); // In-store mode
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedItemName, setCopiedItemName] = useState<string | null>(null);

  // Geolocation & Permission State
  const [geoPermissionState, setGeoPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('prompt');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({
    lat: 55.7558,
    lng: 37.6173,
    city: 'Москва',
    formattedAddress: 'Москва (по умолчанию)',
    source: 'default',
  });
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>(() =>
    getNearbyStores(55.7558, 37.6173, 'Москва')
  );

  // Expanded stores state for collapsing/expanding items list
  const [expandedStores, setExpandedStores] = useState<Record<string, boolean>>({
    kuper: true,
    wb: true,
    samokat: true,
    ozon: true,
    yandex_lavka: true,
    vprok: true,
  });

  // Pick target note: either prop, or first shopping note, or first available note
  const currentNote =
    allNotes.find((n) => n.id === selectedNoteId) ||
    note ||
    allNotes.find((n) => n.category === 'shopping') ||
    allNotes[0] ||
    null;

  // Extract items
  const items: ShoppingItem[] = currentNote
    ? extractShoppingItems(currentNote.content)
    : [];

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Filter items by category tab
  const filteredItems = items.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  // Calculate estimated total basket price
  const estimatedCartTotal = items
    .filter((i) => !i.isCompleted)
    .reduce((sum, i) => sum + (i.estimatedPriceRub || 150), 0);

  // Haptic feedback
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  // Check initial browser permission status if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setGeoPermissionState(status.state as any);
          status.onchange = () => {
            setGeoPermissionState(status.state as any);
          };
          if (status.state === 'granted') {
            handleRequestGeolocation(false);
          }
        })
        .catch(() => {
          setGeoPermissionState('unknown');
        });
    }
  }, []);

  // Request high-accuracy GPS with explicit user consent
  const handleRequestGeolocation = (userTriggered = true) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Геолокация не поддерживается вашим браузером');
      return;
    }

    triggerHaptic();
    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoPermissionState('granted');

        try {
          const rev = await reverseGeocodeCoords(lat, lng);
          const newLoc: LocationInfo = {
            lat,
            lng,
            city: rev.city,
            formattedAddress: rev.formattedAddress,
            source: 'gps',
          };
          setLocationInfo(newLoc);
          setNearbyStores(getNearbyStores(lat, lng, rev.city));
          setGeoLoading(false);
        } catch (err) {
          setLocationInfo({
            lat,
            lng,
            city: 'Рядом с вами',
            formattedAddress: `GPS координаты (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
            source: 'gps',
          });
          setNearbyStores(getNearbyStores(lat, lng, 'Рядом с вами'));
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoPermissionState('denied');
          if (userTriggered) {
            setGeoError(
              'Доступ к геолокации запрещен в браузере. Выберите город вручную из списка ниже.'
            );
            setShowCityPicker(true);
          }
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError('GPS сигнал недоступен. Выберите город вручную.');
          setShowCityPicker(true);
        } else if (err.code === err.TIMEOUT) {
          setGeoError('Таймаут определения координат. Попробуйте снова или выберите город.');
          setShowCityPicker(true);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Manual city selection
  const handleSelectCity = (cityKey: string) => {
    const c = MAJOR_CITIES[cityKey];
    if (!c) return;
    triggerHaptic();
    const newLoc: LocationInfo = {
      lat: c.lat,
      lng: c.lng,
      city: c.name,
      formattedAddress: `${c.name} (выбрано вручную)`,
      source: 'manual',
    };
    setLocationInfo(newLoc);
    setNearbyStores(getNearbyStores(c.lat, c.lng, c.name));
    setShowCityPicker(false);
    setGeoError(null);
  };

  // Toggle checkbox state of an item in the markdown text
  const handleToggleItem = (itemToToggle: ShoppingItem) => {
    triggerHaptic();
    if (!currentNote || !onUpdateNote) return;

    const lines = currentNote.content.split('\n');
    const newLines = lines.map((line, idx) => {
      if (idx === itemToToggle.lineIndex) {
        if (line.includes('- [ ]')) {
          return line.replace('- [ ]', '- [x]');
        } else if (line.includes('- [x]') || line.includes('- [X]')) {
          return line.replace(/- \[[xX]\]/, '- [ ]');
        } else {
          return `- [${itemToToggle.isCompleted ? ' ' : 'x'}] ${line.replace(/^[-*•]\s*/, '')}`;
        }
      }
      return line;
    });

    const updatedNote: Note = {
      ...currentNote,
      content: newLines.join('\n'),
      updatedAt: Date.now(),
    };

    onUpdateNote(updatedNote);

    // Confetti celebration if 100% completed
    if (!itemToToggle.isCompleted && completedCount + 1 === totalCount && totalCount > 0) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  // Share formatted shopping list
  const handleShareList = async () => {
    triggerHaptic();
    const text = formatShoppingListForSharing(items, currentNote?.title || 'Список покупок');

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentNote?.title || 'Список покупок NotebookSmart',
          text,
        });
      } catch (err) {
        // Ignored
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  // Copy single product name for manual searching
  const handleCopyItem = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(name);
      setCopiedItemName(name);
      setTimeout(() => setCopiedItemName(null), 1800);
    }
  };

  const toggleStoreExpanded = (storeId: string) => {
    triggerHaptic();
    setExpandedStores((prev) => ({
      ...prev,
      [storeId]: prev[storeId] === undefined ? false : !prev[storeId],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28 text-stone-900 dark:text-stone-100 transition-colors">
      {/* HEADER BAR */}
      <div className="bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 rounded-3xl p-4 sm:p-5 mb-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span>Корзина покупок</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40">
                  {totalCount} товаров
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Товары отображаются прямо в магазинах с прямыми ссылками
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic();
                setShoppingMode(!shoppingMode);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 border cursor-pointer ${
                shoppingMode
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{shoppingMode ? 'Режим «В магазине» ВКЛ' : 'В магазин (чеклист)'}</span>
            </button>

            <button
              onClick={handleShareList}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
              title="Поделиться списком покупок"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                title="Закрыть"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Note selector if multiple shopping notes exist */}
        {allNotes.filter((n) => extractShoppingItems(n.content).length > 0).length > 1 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-stone-400 whitespace-nowrap">Заметка:</span>
            {allNotes
              .filter((n) => extractShoppingItems(n.content).length > 0)
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    triggerHaptic();
                    setSelectedNoteId(n.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition border cursor-pointer ${
                    selectedNoteId === n.id
                      ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50'
                      : 'bg-stone-100 dark:bg-stone-950/60 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  {n.title || 'Список'} ({extractShoppingItems(n.content).length})
                </button>
              ))}
          </div>
        )}

        {/* Progress & Summary Bar */}
        <div className="bg-stone-50 dark:bg-stone-950/80 rounded-2xl p-3 border border-stone-200 dark:border-stone-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-stone-600 dark:text-stone-400 font-medium">
              Куплено {completedCount} из {totalCount} товаров ({Math.round(progressPercent)}%)
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
              Ориентир: ~{estimatedCartTotal} ₽
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {copiedShare && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-semibold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          <span>Список скопирован для отправки в Telegram / WhatsApp!</span>
        </div>
      )}

      {copiedItemName && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white font-semibold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
          <Copy className="w-4 h-4" />
          <span>Скопировано: «{copiedItemName}»</span>
        </div>
      )}

      {/* 2. GEOLOCATION PERMISSION & STORE LOCATION BAR */}
      <div className="bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-white dark:from-cyan-950/40 dark:via-stone-900 dark:to-stone-900 border border-amber-200/80 dark:border-cyan-500/30 rounded-3xl p-4 sm:p-5 mb-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 dark:text-cyan-300 uppercase tracking-wide">
                  Геолокация магазинов рядом
                </span>
                {locationInfo.source === 'gps' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-500/30">
                    GPS Активен
                  </span>
                )}
                {locationInfo.source === 'manual' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-indigo-500/20 text-amber-900 dark:text-indigo-300 font-bold border border-amber-200 dark:border-indigo-500/30">
                    Город выбран
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-stone-900 dark:text-white mt-0.5">
                {locationInfo.formattedAddress}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Поиск Пятёрочки, Магнита, ВкусВилла и Перекрёстка с расстоянием от вас
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => handleRequestGeolocation(true)}
              disabled={geoLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition active:scale-95 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
              <span>{geoLoading ? 'Определение GPS...' : 'Определить по GPS'}</span>
            </button>

            <button
              onClick={() => setShowCityPicker(!showCityPicker)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold border border-stone-200 dark:border-stone-700 transition cursor-pointer"
            >
              Выбрать город ▾
            </button>
          </div>
        </div>

        {/* Permission explanation or error banner */}
        {geoPermissionState === 'prompt' && locationInfo.source === 'default' && (
          <div className="mt-3 pt-3 border-t border-amber-900/10 dark:border-stone-800 flex items-center gap-2 text-xs text-stone-600 dark:text-cyan-200/80">
            <Compass className="w-4 h-4 text-amber-600 dark:text-cyan-400 shrink-0" />
            <span>
              Нажмите <strong>«Определить по GPS»</strong>, чтобы браузер запросил разрешение на геолокацию и показал магазины в вашем дворе.
            </span>
          </div>
        )}

        {geoError && (
          <div className="mt-3 pt-3 border-t border-rose-500/30 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        {/* City picker dropdown */}
        {showCityPicker && (
          <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-2">
              Выберите ваш город для точного поиска магазинов:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(MAJOR_CITIES).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => handleSelectCity(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border cursor-pointer ${
                    locationInfo.city === c.name
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* IN-STORE SHOPPING MODE */}
      {shoppingMode && (
        <div className="bg-white dark:bg-stone-900 border border-emerald-400/50 dark:border-emerald-500/40 rounded-3xl p-5 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-lg text-stone-900 dark:text-white">Режим «В магазине»</h3>
            </div>
            <span className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-500/30">
              {completedCount} / {totalCount} готово
            </span>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-slate-400 text-center py-6">
              Список пуст. Добавьте продукты в заметку, например: «Молоко 2л, Сыр, Хлеб».
            </p>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleItem(item)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer select-none ${
                    item.isCompleted
                      ? 'bg-stone-50 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800/60 text-stone-400 dark:text-slate-500'
                      : 'bg-[#fffdf9] dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-slate-100 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-emerald-600 dark:text-emerald-400 shrink-0">
                      {item.isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 fill-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-stone-300 dark:text-stone-500" />
                      )}
                    </button>
                    <div>
                      <span
                        className={`text-base font-semibold block ${
                          item.isCompleted ? 'line-through text-stone-400 dark:text-slate-500' : 'text-stone-900 dark:text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          Количество: {item.quantity} {item.unit || 'шт'}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-mono text-stone-500 dark:text-slate-400">
                    ~{item.estimatedPriceRub} ₽
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUICK CATEGORY FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
        <button
          onClick={() => {
            triggerHaptic();
            setActiveCategory('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-white hover:bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 border-stone-200 dark:border-stone-800'
          }`}
        >
          Все товары ({items.length})
        </button>

        {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
          const count = items.filter((i) => i.category === catKey).length;
          if (count === 0) return null;

          return (
            <button
              key={catKey}
              onClick={() => {
                triggerHaptic();
                setActiveCategory(catKey);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border cursor-pointer ${
                activeCategory === catKey
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-white hover:bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 border-stone-200 dark:border-stone-800'
              }`}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
              <span className="text-[10px] px-1 rounded bg-stone-100 dark:bg-stone-950 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* EMPTY LIST STATE */}
      {items.length === 0 && (
        <div className="bg-white dark:bg-stone-900/80 border border-amber-900/10 dark:border-stone-800 rounded-3xl p-8 text-center mb-6 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-stone-900 dark:text-white text-base mb-1">
            В заметке пока не найдены покупки
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-4">
            Напишите в тексте заметки список продуктов с чекбоксами или через запятую, например:
          </p>
          <div className="bg-[#fffdf9] dark:bg-stone-950 rounded-2xl p-3 border border-amber-900/15 dark:border-stone-800 font-mono text-xs text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto text-left leading-relaxed">
            - [ ] Молоко 3.2% 2 л<br />
            - [ ] Сыр Гауда 300 г<br />
            - [ ] Хлеб бородинский 1 шт<br />
            - [ ] Кофе зерновой 500 г
          </div>
        </div>
      )}

      {/* 3. SUGGESTED STORES WITH EXACT ITEMS LISTED INSIDE */}
      <div className="space-y-6">
        {/* SECTION 1: MARKETPLACES & ONLINE DELIVERY WITH DIRECT PRODUCT LINKS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  1. Магазины и маркетплейсы с вашими товарами
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  В каждом магазине отображаются именно ваши продукты со ссылками в 1 клик
                </p>
              </div>
            </div>
            <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/30">
              {STORE_OPTIONS.length} магазинов
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STORE_OPTIONS.map((store) => {
              const isExpanded = expandedStores[store.id] !== false;
              const displayItems = filteredItems.length > 0 ? filteredItems : items;

              return (
                <div
                  key={store.id}
                  className="bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 rounded-3xl p-4 flex flex-col justify-between hover:border-amber-400/60 dark:hover:border-stone-700 transition shadow-sm"
                >
                  <div>
                    {/* Store Title Bar */}
                    <div className="flex items-center justify-between mb-2 pb-2.5 border-b border-stone-200 dark:border-stone-800">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: store.logoColor }}
                        />
                        <div>
                          <h4 className="font-bold text-stone-900 dark:text-white text-sm leading-tight">
                            {store.name}
                          </h4>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {store.deliveryTime}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-semibold">
                          {store.tag}
                        </span>
                        <button
                          onClick={() => toggleStoreExpanded(store.id)}
                          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
                          title={isExpanded ? 'Свернуть товары' : 'Развернуть товары'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-slate-400 mb-3">{store.description}</p>

                    {/* EXACT ITEMS FOR THIS STORE */}
                    {isExpanded && (
                      <div className="mb-4 space-y-1.5 bg-[#fffdf9] dark:bg-stone-950/70 p-2.5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 dark:text-stone-400 px-1 mb-1">
                          <span>Товары из вашего списка ({displayItems.length}):</span>
                          <span>Прямой переход</span>
                        </div>

                        {displayItems.length === 0 ? (
                          <div className="text-xs text-stone-400 py-2 text-center">
                            Нет товаров в выбранной категории
                          </div>
                        ) : (
                          displayItems.map((item) => {
                            const directItemUrl = getItemStoreUrl(store.id, item.name);

                            return (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between p-2 rounded-xl text-xs transition border ${
                                  item.isCompleted
                                    ? 'bg-stone-50 dark:bg-stone-900/40 text-stone-400 dark:text-slate-500 border-stone-200 dark:border-stone-800/40'
                                    : 'bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/90 text-stone-800 dark:text-slate-200 border-stone-200 dark:border-stone-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <button
                                    onClick={() => handleToggleItem(item)}
                                    className="text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer"
                                    title={item.isCompleted ? 'Отметить некупленным' : 'Отметить купленным'}
                                  >
                                    {item.isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 fill-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-stone-300 dark:text-stone-500" />
                                    )}
                                  </button>

                                  <span
                                    className={`truncate font-medium ${
                                      item.isCompleted ? 'line-through text-stone-400 dark:text-slate-500' : 'text-stone-900 dark:text-slate-100'
                                    }`}
                                  >
                                    {item.name}
                                  </span>

                                  {item.quantity && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-stone-800 text-amber-800 dark:text-indigo-300 font-mono shrink-0">
                                      {item.quantity} {item.unit || 'шт'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400 hidden sm:inline">
                                    ~{item.estimatedPriceRub} ₽
                                  </span>

                                  <a
                                    href={directItemUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-900 dark:text-amber-300 hover:text-white border border-amber-300 dark:border-amber-500/40 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                                    title={`Найти «${item.name}» в ${store.name}`}
                                  >
                                    <span>В магазин</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Multi-Item Basket Action */}
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800/80 flex items-center gap-2">
                    <a
                      href={
                        store.getMultiItemCartUrl
                          ? store.getMultiItemCartUrl(items.map((i) => i.name))
                          : store.getSearchUrl(items.slice(0, 3).map((i) => i.name).join(' ') || 'продукты')
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-white text-xs font-bold border border-stone-200 dark:border-stone-700 transition active:scale-98"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Собрать корзину на {store.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>

                    <button
                      onClick={(e) => handleCopyItem(items.map((i) => i.name).join(', '), e)}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                      title="Скопировать список для поиска"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: NEARBY OFFLINE SUPERMARKETS WITH GPS DISTANCE & CHECKLIST */}
        <div className="bg-white dark:bg-stone-900 border border-amber-900/10 dark:border-stone-800 rounded-3xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  2. Ближайшие супермаркеты рядом с вами (пешком)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Пятёрочка, Магнит, ВкусВилл, Перекрёсток с маршрутами и чеклистом товаров
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-900 dark:text-cyan-400 font-semibold bg-amber-50 dark:bg-cyan-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-cyan-500/30">
                {nearbyStores.length} филиалов рядом
              </span>
            </div>
          </div>

          {/* Quick External Map Openers */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <a
              href={`https://yandex.ru/maps/?text=${encodeURIComponent(`Супермаркеты ${locationInfo.formattedAddress}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-center text-xs font-semibold text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <span>🗺️ Яндекс Карты</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href={`https://2gis.ru/search/${encodeURIComponent(`Продуктовые магазины ${locationInfo.city || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-center text-xs font-semibold text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <span>📍 2ГИС</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Supermarkets near ${locationInfo.formattedAddress}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-center text-xs font-semibold text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <span>🌐 Google Maps</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>

          {/* Supermarket Cards with In-Store Items Checklists */}
          <div className="space-y-3.5">
            {nearbyStores.slice(0, 6).map((store) => (
              <div
                key={store.id}
                className="bg-[#fffdfa] dark:bg-stone-950/80 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 hover:border-amber-400 dark:hover:border-stone-700 transition shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-stone-900 border border-amber-200/60 dark:border-stone-800 text-xl flex items-center justify-center shrink-0">
                      🏪
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                        <span>{store.name}</span>
                        <span className="text-[10px] font-normal px-2 py-0.2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-slate-400">
                          {store.workingHours}
                        </span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                        <span className="text-amber-700 dark:text-cyan-400 font-bold">
                          {store.distanceText} • {store.walkMinutes} мин пешком
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-xs">{store.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Route Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <a
                      href={store.mapYandexUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-slate-200 text-xs font-semibold border border-stone-200 dark:border-stone-700 transition flex items-center gap-1"
                    >
                      <span>Маршрут в Я.Картах</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={store.map2GisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-slate-200 text-xs font-semibold border border-stone-200 dark:border-stone-700 transition flex items-center gap-1"
                    >
                      <span>2ГИС</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* EXACT ITEMS TO BUY IN THIS SUPERMARKET */}
                {items.length > 0 && (
                  <div className="mt-2 pt-2.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 rounded-xl p-2.5">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 mb-1.5 font-medium px-1">
                      <span>Товары для покупки в этом магазине:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                        {completedCount}/{totalCount} куплено
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItem(item)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition cursor-pointer select-none text-xs ${
                            item.isCompleted
                              ? 'bg-stone-100 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800/60 text-stone-400 dark:text-slate-500'
                              : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-slate-200 hover:border-amber-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <button className="text-emerald-600 dark:text-emerald-400 shrink-0">
                              {item.isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-stone-300 dark:text-stone-500" />
                              )}
                            </button>
                            <span className={`truncate ${item.isCompleted ? 'line-through' : ''}`}>
                              {item.name}
                            </span>
                            {item.quantity && (
                              <span className="text-[10px] text-amber-700 dark:text-indigo-400 font-mono shrink-0">
                                {item.quantity} {item.unit || 'шт'}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-mono text-stone-400 dark:text-slate-500 shrink-0 ml-2">
                            ~{item.estimatedPriceRub} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
