import React, { useState, useEffect } from 'react';
import { Note, ShoppingItem, NearbyStore } from '../types';
import {
  STORE_OPTIONS,
  extractShoppingItems,
  formatShoppingListForSharing,
  getMapSearchUrls,
} from '../utils/shoppingParser';
import { getNearbyStores } from '../utils/geoStores';
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
  Search,
  Filter,
  Check,
  Zap,
  Store,
  Truck,
  RotateCcw,
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
  const [selectedItemForStore, setSelectedItemForStore] = useState<ShoppingItem | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>(getNearbyStores());
  const [copiedShare, setCopiedShare] = useState(false);

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

  // Toggle checklist item
  const handleToggleItem = (itemToToggle: ShoppingItem) => {
    triggerHaptic();
    if (!targetNote || !onUpdateNote) return;

    const isNowCompleted = !itemToToggle.isCompleted;

    // Replace checkbox in note content
    let newContent = targetNote.content;
    const lines = newContent.split('\n');
    const updatedLines = lines.map((line) => {
      if (line.includes(itemToToggle.originalText) || line.includes(itemToToggle.name)) {
        if (/^[-*•]?\s*\[[ xX]\]/.test(line)) {
          return line.replace(/^([ -*•]?\s*)\[([ xX])\]/, `$1[${isNowCompleted ? 'x' : ' '}]`);
        }
        // If it didn't have a checkbox, add one
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

  // GPS geolocation lookup for offline in-store shopping
  const requestGeolocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          setNearbyStores(getNearbyStores(lat, lng));
          setGeoLoading(false);
        },
        () => {
          setGeoLoading(false);
          // Fallback to default city center
          setNearbyStores(getNearbyStores());
        },
        { timeout: 7000 }
      );
    }
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

  const itemNamesCombined = items.slice(0, 5).map((i) => i.name).join(' ');

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28">
      {/* Top Banner & Mode Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-indigo-600/20 text-indigo-400">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Где купить список покупок
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Маркетплейсы, доставка за 15 минут или супермаркеты рядом
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic();
                setShoppingMode(!shoppingMode);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
                shoppingMode
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{shoppingMode ? 'Выйти из режима покупки' : 'Режим «В магазине»'}</span>
            </button>

            <button
              onClick={handleShareList}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Поделиться списком"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Note selector if multiple shopping notes exist */}
        {allNotes.length > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-slate-400 whitespace-nowrap">Заметка:</span>
            {allNotes.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelectedNoteId(n.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  (targetNote?.id === n.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {n.title || 'Заметка'}
              </button>
            ))}
          </div>
        )}

        {/* Progress & Estimated cart budget */}
        {totalCount > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
                <span>Прогресс сбора корзины:</span>
                <span className="font-bold text-indigo-400">
                  {completedCount} из {totalCount} куплено ({Math.round(progressPercent)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="text-[11px] text-slate-400 block">Ориентировочный бюджет:</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                ~{estimatedCartTotal.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>
        )}
      </div>

      {copiedShare && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-semibold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          <span>Список скопирован для отправки в мессенджер!</span>
        </div>
      )}

      {/* IN-STORE SHOPPING MODE (Distraction-free checklist for physical supermarket) */}
      {shoppingMode ? (
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
      ) : null}

      {/* SHOPPING LIST ITEMS PREVIEW & STORE LINKS */}
      <div className="space-y-6">
        {/* 1. SHOPPING ITEMS PILLS & DIRECT PRODUCT LINKS */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Распознанные продукты из заметки ({items.length})</span>
            </h3>
            {totalCount > 0 && (
              <span className="text-xs text-slate-400">
                Нажмите на продукт для быстрого заказа
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              В заметке пока не найдены продукты. Введите в заметку:
              <br />
              <code className="text-xs text-indigo-300 mt-1 inline-block bg-slate-950 px-2 py-1 rounded">
                - [ ] Молоко 3.2% 2 л, Сыр 500 г, Хлеб, Кофе в зернах
              </code>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    triggerHaptic();
                    setSelectedItemForStore(item);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition active:scale-95 ${
                    item.isCompleted
                      ? 'bg-slate-950 text-slate-500 border-slate-800 line-through'
                      : selectedItemForStore?.id === item.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                  }`}
                >
                  <span>{item.name}</span>
                  {item.quantity && (
                    <span className="text-[10px] px-1 rounded bg-slate-900/60 text-indigo-300 font-mono">
                      {item.quantity} {item.unit || 'шт'}
                    </span>
                  )}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>
          )}

          {/* If a specific item is selected for lookup */}
          {selectedItemForStore && (
            <div className="mt-4 pt-3 border-t border-slate-800 bg-slate-950/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">
                  Купить «{selectedItemForStore.name}»:
                </span>
                <button
                  onClick={() => setSelectedItemForStore(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕ Закрыть
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(
                    selectedItemForStore.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs rounded-lg bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-700/50 hover:bg-fuchsia-900 transition flex items-center gap-1"
                >
                  Wildberries <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://www.ozon.ru/search/?text=${encodeURIComponent(
                    selectedItemForStore.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs rounded-lg bg-blue-950/60 text-blue-300 border border-blue-700/50 hover:bg-blue-900 transition flex items-center gap-1"
                >
                  Ozon Fresh <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://kuper.ru/search?q=${encodeURIComponent(
                    selectedItemForStore.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900 transition flex items-center gap-1"
                >
                  Купер (Сбер) <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://samokat.ru/search?text=${encodeURIComponent(
                    selectedItemForStore.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs rounded-lg bg-rose-950/60 text-rose-300 border border-rose-700/50 hover:bg-rose-900 transition flex items-center gap-1"
                >
                  Самокат <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://market.yandex.ru/search?text=${encodeURIComponent(
                    selectedItemForStore.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs rounded-lg bg-amber-950/60 text-amber-300 border border-amber-700/50 hover:bg-amber-900 transition flex items-center gap-1"
                >
                  Яндекс Маркет <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 2. МАРКЕТПЛЕЙСЫ: ПОЛНАЯ КОРЗИНА И ПОИСК */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-base text-white">
              1. Маркетплейсы (Поиск всей корзины)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STORE_OPTIONS.filter((s) => s.type === 'marketplace').map((store) => {
              const multiCartUrl = store.getMultiItemCartUrl
                ? store.getMultiItemCartUrl(items.map((i) => i.name))
                : store.getSearchUrl(itemNamesCombined || 'продукты');

              return (
                <div
                  key={store.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: store.logoColor }}
                        />
                        <h4 className="font-semibold text-white text-sm">{store.name}</h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {store.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{store.description}</p>
                    <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{store.deliveryTime}</span>
                    </div>
                  </div>

                  <a
                    href={multiCartUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition active:scale-98"
                  >
                    <span>Собрать корзину на {store.name}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. ЭКСПРЕСС-ДОСТАВКА (15–30 МИНУТ) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-base text-white">
              2. Экспресс-доставка продуктов на дом
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STORE_OPTIONS.filter((s) => s.type === 'delivery').map((store) => {
              const searchUrl = store.getSearchUrl(itemNamesCombined || 'продукты');

              return (
                <div
                  key={store.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: store.logoColor }}
                        />
                        <h4 className="font-semibold text-white text-sm">{store.name}</h4>
                      </div>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{store.deliveryTime}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {store.description}
                    </p>
                  </div>

                  <a
                    href={searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition active:scale-98"
                  >
                    <span>Заказать доставку</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. В САМОМ МАГАЗИНЕ (БЛИЖАЙШИЕ МАГАЗИНЫ НА КАРТЕ) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-base text-white">
                  3. В самом магазине (Супермаркеты рядом)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Пятёрочка, Магнит, ВкусВилл, Перекрёсток с маршрутами и временем в пути
              </p>
            </div>

            <button
              onClick={requestGeolocation}
              disabled={geoLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
              <span>{geoLoading ? 'Определение GPS...' : 'Найти магазины рядом'}</span>
            </button>
          </div>

          {/* Quick Map Openers */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <a
              href={`https://yandex.ru/maps/?text=${encodeURIComponent('Супермаркеты рядом со мной')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-medium text-slate-200 border border-slate-700 transition"
            >
              🗺️ Яндекс Карты
            </a>
            <a
              href={`https://2gis.ru/search/${encodeURIComponent('Продуктовые магазины')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-medium text-slate-200 border border-slate-700 transition"
            >
              📍 2ГИС
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Supermarkets near me')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-medium text-slate-200 border border-slate-700 transition"
            >
              🌐 Google Maps
            </a>
          </div>

          {/* List of nearby stores with distance */}
          <div className="space-y-2.5">
            {nearbyStores.slice(0, 5).map((st) => (
              <div
                key={st.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                    🏪
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">{st.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="text-cyan-400 font-medium">
                        {st.distanceText} • {st.walkMinutes} мин пешком
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400">{st.workingHours}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={st.mapYandexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    title="Маршрут в Яндекс Картах"
                  >
                    Я.Карты
                  </a>
                  <a
                    href={st.map2GisUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    title="Маршрут в 2ГИС"
                  >
                    2ГИС
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
