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
  Sparkles,
  Check,
  Zap,
  Store,
  Truck,
  RotateCcw,
  Compass,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
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
    vkusvill: true,
  });

  // Pick target note or aggregate
  const targetNote = selectedNoteId ? allNotes.find((n) => n.id === selectedNoteId) || note : note;

  // Extract items
  const items: ShoppingItem[] = targetNote
    ? extractShoppingItems(targetNote.content)
    : allNotes.flatMap((n) => extractShoppingItems(n.content));

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Estimated cart total sum
  const estimatedCartTotal = items.reduce((acc, i) => acc + (i.estimatedPriceRub || 150), 0);

  // Filter items by category
  const filteredItems = items.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  // Haptic feedback
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  // Check initial browser permission state if API available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          setGeoPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          if (permissionStatus.state === 'granted') {
            // Already permitted, silently obtain accurate position
            handleRequestGeolocation(false);
          }
          permissionStatus.onchange = () => {
            setGeoPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          };
        })
        .catch(() => {
          setGeoPermissionState('prompt');
        });
    }
  }, []);

  // Request high-accuracy GPS Geolocation
  const handleRequestGeolocation = (isUserClick = true) => {
    if (isUserClick) triggerHaptic();

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Геолокация не поддерживается вашим браузером');
      setGeoPermissionState('denied');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoPermissionState('granted');

        try {
          const loc = await reverseGeocodeCoords(lat, lng);
          setLocationInfo(loc);
          setNearbyStores(getNearbyStores(lat, lng, loc.formattedAddress));
        } catch {
          const loc: LocationInfo = {
            lat,
            lng,
            formattedAddress: `Координаты: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            source: 'gps',
          };
          setLocationInfo(loc);
          setNearbyStores(getNearbyStores(lat, lng));
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoPermissionState('denied');
          setGeoError('Доступ к геолокации отклонен. Вы можете выбрать город вручную.');
        } else {
          setGeoError('Не удалось точно определить координаты GPS (таймаут). Попробуйте снова или выберите город.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Select city manually
  const handleSelectCity = (cityKey: string) => {
    triggerHaptic();
    const city = MAJOR_CITIES[cityKey];
    if (city) {
      const loc: LocationInfo = {
        lat: city.lat,
        lng: city.lng,
        city: city.name,
        formattedAddress: `${city.name}`,
        source: 'manual',
      };
      setLocationInfo(loc);
      setNearbyStores(getNearbyStores(city.lat, city.lng, city.name));
      setShowCityPicker(false);
      setGeoError(null);
    }
  };

  // Toggle checklist item
  const handleToggleItem = (itemToToggle: ShoppingItem) => {
    triggerHaptic();
    if (!targetNote || !onUpdateNote) return;

    const isNowCompleted = !itemToToggle.isCompleted;

    // Replace checkbox in note content
    const lines = targetNote.content.split('\n');
    const updatedLines = lines.map((line) => {
      if (line.includes(itemToToggle.originalText) || line.includes(itemToToggle.name)) {
        if (/^[-*•]?\s*\[[ xX]\]/.test(line)) {
          return line.replace(/^([ -*•]?\s*)\[([ xX])\]/, `$1[${isNowCompleted ? 'x' : ' '}]`);
        }
        return `- [${isNowCompleted ? 'x' : ' '}] ${line.replace(/^[-*•]\s*/, '')}`;
      }
      return line;
    });

    const updatedNote: Note = {
      ...targetNote,
      content: updatedLines.join('\n'),
      updatedAt: Date.now(),
    };

    onUpdateNote(updatedNote);

    // If all completed, trigger celebratory confetti!
    if (isNowCompleted && completedCount + 1 === totalCount && totalCount > 0) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  // Copy single item name
  const handleCopyItem = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    navigator.clipboard.writeText(name);
    setCopiedItemName(name);
    setTimeout(() => setCopiedItemName(null), 1800);
  };

  // Share shopping list
  const handleShareList = () => {
    triggerHaptic();
    const text = formatShoppingListForSharing(items, targetNote?.title || 'Список покупок');
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: targetNote?.title || 'Список покупок',
        text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const toggleStoreExpanded = (storeId: string) => {
    setExpandedStores((prev) => ({
      ...prev,
      [storeId]: prev[storeId] === undefined ? false : !prev[storeId],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28">
      {/* HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 mb-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Корзина покупок</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  {totalCount} товаров
                </span>
              </h2>
              <p className="text-xs text-slate-400">
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 border ${
                shoppingMode
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{shoppingMode ? 'Режим «В магазине» ВКЛ' : 'В магазин (чеклист)'}</span>
            </button>

            <button
              onClick={handleShareList}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Поделиться списком покупок"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
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
            <span className="text-xs text-slate-500 whitespace-nowrap">Заметка:</span>
            {allNotes
              .filter((n) => extractShoppingItems(n.content).length > 0)
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    triggerHaptic();
                    setSelectedNoteId(n.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
                    selectedNoteId === n.id
                      ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {n.title || 'Список'} ({extractShoppingItems(n.content).length})
                </button>
              ))}
          </div>
        )}

        {/* Progress & Summary Bar */}
        <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">
              Куплено {completedCount} из {totalCount} товаров ({Math.round(progressPercent)}%)
            </span>
            <span className="text-emerald-400 font-mono font-bold">
              Ориентир: ~{estimatedCartTotal} ₽
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {copiedShare && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-semibold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          <span>Список скопирован для отправки в Telegram / WhatsApp!</span>
        </div>
      )}

      {copiedItemName && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
          <Copy className="w-4 h-4" />
          <span>Скопировано: «{copiedItemName}»</span>
        </div>
      )}

      {/* 2. GEOLOCATION PERMISSION & STORE LOCATION BAR */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-3xl p-4 sm:p-5 mb-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                  Геолокация магазинов рядом
                </span>
                {locationInfo.source === 'gps' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    GPS Активен
                  </span>
                )}
                {locationInfo.source === 'manual' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    Город выбран
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                {locationInfo.formattedAddress}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Поиск Пятёрочки, Магнита, ВкусВилла и Перекрёстка с расстоянием от вас
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => handleRequestGeolocation(true)}
              disabled={geoLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition active:scale-95 shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
              <span>{geoLoading ? 'Определение GPS...' : 'Определить по GPS'}</span>
            </button>

            <button
              onClick={() => setShowCityPicker(!showCityPicker)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              Выбрать город ▾
            </button>
          </div>
        </div>

        {/* Permission explanation or error banner */}
        {geoPermissionState === 'prompt' && locationInfo.source === 'default' && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-cyan-200/80">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Нажмите <strong>«Определить по GPS»</strong>, чтобы браузер запросил разрешение на геолокацию и показал магазины в вашем дворе.
            </span>
          </div>
        )}

        {geoError && (
          <div className="mt-3 pt-3 border-t border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        {/* City picker dropdown */}
        {showCityPicker && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Выберите ваш город для точного поиска магазинов:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(MAJOR_CITIES).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => handleSelectCity(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                    locationInfo.city === c.name
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* IN-STORE SHOPPING MODE (DISTRACTION-FREE CHECKLIST IN AISLES) */}
      {shoppingMode && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="font-bold text-lg text-white">Режим «В магазине»</h3>
            </div>
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
              {completedCount} / {totalCount} готово
            </span>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
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
                      ? 'bg-slate-950/60 border-slate-800/60 text-slate-500'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-emerald-400 shrink-0">
                      {item.isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 fill-emerald-500/20 text-emerald-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                    <div>
                      <span
                        className={`text-base font-semibold block ${
                          item.isCompleted ? 'line-through text-slate-500' : 'text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="text-xs text-indigo-400 font-medium">
                          Количество: {item.quantity} {item.unit || 'шт'}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
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
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
            activeCategory === 'all'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
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
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
                activeCategory === catKey
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
              <span className="text-[10px] px-1 rounded bg-slate-950 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* EMPTY LIST STATE */}
      {items.length === 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-white text-base mb-1">
            В заметке пока не найдены покупки
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Напишите в тексте заметки список продуктов с чекбоксами или через запятую, например:
          </p>
          <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 font-mono text-xs text-emerald-300 max-w-sm mx-auto text-left leading-relaxed">
            - [ ] Молоко 3.2% 2 л<br />
            - [ ] Сыр Гауда 300 г<br />
            - [ ] Хлеб бородинский 1 шт<br />
            - [ ] Кофе зерновой 500 г
          </div>
        </div>
      )}

      {/* 3. SUGGESTED STORES WITH EXACT ITEMS LISTED INSIDE (ТРЕБОВАНИЕ ПОЛЬЗОВАТЕЛЯ) */}
      <div className="space-y-6">
        {/* SECTION 1: MARKETPLACES & ONLINE DELIVERY WITH DIRECT PRODUCT LINKS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-base text-white">
                  1. Магазины и маркетплейсы с вашими товарами
                </h3>
                <p className="text-xs text-slate-400">
                  В каждом магазине отображаются именно ваши продукты со ссылками в 1 клик
                </p>
              </div>
            </div>
            <span className="text-xs text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-500/30">
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
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition shadow-lg"
                >
                  <div>
                    {/* Store Title Bar */}
                    <div className="flex items-center justify-between mb-2 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: store.logoColor }}
                        />
                        <div>
                          <h4 className="font-bold text-white text-sm leading-tight">
                            {store.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {store.deliveryTime}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                          {store.tag}
                        </span>
                        <button
                          onClick={() => toggleStoreExpanded(store.id)}
                          className="p-1 text-slate-400 hover:text-white"
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

                    <p className="text-xs text-slate-400 mb-3">{store.description}</p>

                    {/* EXACT ITEMS FOR THIS STORE (ПРЯМЫЕ ССЫЛКИ НА ВБИТЫЕ ТОВАРЫ) */}
                    {isExpanded && (
                      <div className="mb-4 space-y-1.5 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1 mb-1">
                          <span>Товары из вашего списка ({displayItems.length}):</span>
                          <span>Прямой переход</span>
                        </div>

                        {displayItems.length === 0 ? (
                          <div className="text-xs text-slate-500 py-2 text-center">
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
                                    ? 'bg-slate-900/40 text-slate-500 border-slate-800/40'
                                    : 'bg-slate-900 hover:bg-slate-800/90 text-slate-200 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <button
                                    onClick={() => handleToggleItem(item)}
                                    className="text-emerald-400 shrink-0"
                                    title={item.isCompleted ? 'Отметить некупленным' : 'Отметить купленным'}
                                  >
                                    {item.isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 fill-emerald-500/20 text-emerald-400" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-500" />
                                    )}
                                  </button>

                                  <span
                                    className={`truncate font-medium ${
                                      item.isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
                                    }`}
                                  >
                                    {item.name}
                                  </span>

                                  {item.quantity && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 font-mono shrink-0">
                                      {item.quantity} {item.unit || 'шт'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                                    ~{item.estimatedPriceRub} ₽
                                  </span>

                                  <a
                                    href={directItemUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-[11px] font-semibold transition flex items-center gap-1"
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
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <a
                      href={
                        store.getMultiItemCartUrl
                          ? store.getMultiItemCartUrl(items.map((i) => i.name))
                          : store.getSearchUrl(items.slice(0, 3).map((i) => i.name).join(' ') || 'продукты')
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition active:scale-98"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Собрать корзину на {store.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>

                    <button
                      onClick={(e) => handleCopyItem(items.map((i) => i.name).join(', '), e)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  2. Ближайшие супермаркеты рядом с вами (пешком)
                </h3>
                <p className="text-xs text-slate-400">
                  Пятёрочка, Магнит, ВкусВилл, Перекрёсток с маршрутами и чеклистом товаров
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-cyan-400 font-semibold bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
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
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <span>🗺️ Яндекс Карты</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href={`https://2gis.ru/search/${encodeURIComponent(`Продуктовые магазины ${locationInfo.city || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <span>📍 2ГИС</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Supermarkets near ${locationInfo.formattedAddress}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5"
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
                className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 text-xl flex items-center justify-center shrink-0">
                      🏪
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{store.name}</span>
                        <span className="text-[10px] font-normal px-2 py-0.2 rounded-full bg-slate-800 text-slate-400">
                          {store.workingHours}
                        </span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="text-cyan-400 font-bold">
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
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                    >
                      <span>Маршрут в Я.Картах</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={store.map2GisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                    >
                      <span>2ГИС</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* EXACT ITEMS TO BUY IN THIS SUPERMARKET (ТРЕБОВАНИЕ ПОЛЬЗОВАТЕЛЯ) */}
                {items.length > 0 && (
                  <div className="mt-2 pt-2.5 border-t border-slate-850 bg-slate-900/60 rounded-xl p-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium px-1">
                      <span>Товары для покупки в этом магазине:</span>
                      <span className="text-emerald-400 font-mono">
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
                              ? 'bg-slate-950/60 border-slate-800/60 text-slate-500'
                              : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <button className="text-emerald-400 shrink-0">
                              {item.isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-400" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </button>
                            <span className={`truncate ${item.isCompleted ? 'line-through' : ''}`}>
                              {item.name}
                            </span>
                            {item.quantity && (
                              <span className="text-[10px] text-indigo-400 font-mono shrink-0">
                                {item.quantity} {item.unit || 'шт'}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
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
