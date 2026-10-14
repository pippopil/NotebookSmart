import React from 'react';
import { NoteCategory, PaperStyleType } from '../types';
import {
  X,
  Sparkles,
  Wallet,
  ShoppingCart,
  Calendar,
  Car,
  HeartPulse,
  Luggage,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';

export interface NoteTemplate {
  id: string;
  title: string;
  category: NoteCategory;
  paperStyle: PaperStyleType;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  content: string;
}

export const EVERYDAY_TEMPLATES: NoteTemplate[] = [
  {
    id: 'tpl-budget-monthly',
    title: '💰 Семейный бюджет и коммуналка',
    category: 'payment',
    paperStyle: 'grid',
    description: 'Учет зарплаты, аванса, аренды, ЖКХ, интернета и расчет остатка',
    icon: Wallet,
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    content: `Учет финансов за текущий месяц:

=== Доходы (Прибыль) ===
+ Зарплата основная: 110 000 руб
+ Аванс: 30 000
+ Премия / Подработка: 15 000
+ Кэшбэк и проценты: 2 400

=== Расходы (Обязательные платежи) ===
- Аренда / Ипотека: 38 000 руб
- Коммунальные услуги (ЖКХ): 4 500 + 800
- Интернет и мобильная связь: 650 + 900
- Продукты на месяц: 1 200 * 22
- Проездной / Бензин: 5 000
- Подписки и сервисы: 299 + 399 + 199

Остаток в итоге (чистая прибыль):`,
  },
  {
    id: 'tpl-groceries-standard',
    title: '🛒 Базовый закуп продуктов (Холодильник)',
    category: 'shopping',
    paperStyle: 'lines',
    description: 'Готовый список молочных продуктов, мяса, овощей и бакалеи на неделю',
    icon: ShoppingCart,
    iconColor: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    content: `Список продуктов в тетради:
- [ ] Молоко 3.2% 2 л
- [ ] Сливочное масло 82.5% 1 уп
- [ ] Яйца куриные С0 1 дес
- [ ] Творог 5% 400 г
- [ ] Сыр твердый 350 г
- [ ] Хлеб цельнозерновой 1 шт
- [ ] Филе индейки или курицы 1.5 кг
- [ ] Помидоры и огурцы 1.2 кг
- [ ] Бананы и яблоки 2 кг
- [ ] Кофе зерновой 500 г
- [ ] Чай листовой 1 пачка
- [ ] Макароны твердых сортов 2 уп
- [ ] Оливковое масло 500 мл

Сладости и десерт:
Шоколад: 130 * 2
Круассаны: 75 * 4`,
  },
  {
    id: 'tpl-car-expenses',
    title: '🚗 Расходы на автомобиль и транспорт',
    category: 'payment',
    paperStyle: 'grid',
    description: 'Бензин, платные дороги, мойка, страховка, парковка и ТО',
    icon: Car,
    iconColor: 'text-blue-700 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/20',
    content: `Расчет авто-расходов:

=== Доходы на транспорт ===
+ Компенсация ГСМ от работы: 12 000 руб

=== Расходы на авто ===
- Бензин АИ-95 (полный бак): 58 * 50
- Мойка и комплексная чистка: 1 200
- Оплата парковки за месяц: 4 500
- Омывающая жидкость: 350 * 2
- Замена масла и фильтров: 6 800

Остаток бюджета на авто:`,
  },
  {
    id: 'tpl-health-pharmacy',
    title: '💊 Аптечка, здоровье и витамины',
    category: 'shopping',
    paperStyle: 'dots',
    description: 'Витаминный комплекс, базовые медикаменты и запись к врачу',
    icon: HeartPulse,
    iconColor: 'text-rose-700 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    content: `Здоровье и профилактика:
- [ ] Витамин D3 2000 ME
- [ ] Омега-3 1000 мг 1 банка
- [ ] Магний B6 1 уп
- [ ] Пластырь бактерицидный
- [ ] Спрей для носа с морской водой
- [ ] Антисептик для рук

Запись на прием и анализы:
15:00 — Стоматолог (профгигиена): 4500 руб
Анализы крови: 2300 + 850

Итого на здоровье:`,
  },
  {
    id: 'tpl-travel-packing',
    title: '✈️ Чеклист сборов в поездку и отпуск',
    category: 'event',
    paperStyle: 'kraft',
    description: 'Документы, техника, одежда, аптечка и план расходов в дороге',
    icon: Luggage,
    iconColor: 'text-purple-700 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-500/20',
    content: `План путешествия:

Документы и билеты:
- [ ] Паспорт РФ и загранпаспорт
- [ ] Посадочные талоны и бронь отеля
- [ ] Банковские карты и наличные

Техника и гаджеты:
- [ ] Смартфон и кабель зарядки
- [ ] Powerbank заряженный 10000 mAh
- [ ] Наушники

Расходы в поездке:
Отель: 4500 * 3
Билеты на поезд / самолет: 14200
Такси в аэропорт: 1450
Питание в дороге: 1200 * 3

Итого бюджет поездки:`,
  },
  {
    id: 'tpl-daily-habits',
    title: '🎯 Ежедневный трекер целей и привычек',
    category: 'note',
    paperStyle: 'dots',
    description: 'Утренний ритуал, спорт, чтение, вода и планирование дня',
    icon: CheckSquare,
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    content: `Трекер привычек на сегодня:
- [ ] Выпить стакан теплой воды после пробуждения
- [ ] Утренняя зарядка и растяжка 15 мин
- [ ] Чтение книги 25 страниц
- [ ] Прогулка на свежем воздухе 6 000 шагов
- [ ] Записать расходы за день в NotebookSmart
- [ ] Лечь спать до 23:30

Главная задача дня:
Подготовить и согласовать отчет по проекту`,
  },
];

interface QuickTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (tpl: NoteTemplate) => void;
}

export const QuickTemplatesModal: React.FC<QuickTemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 dark:bg-black/80 backdrop-blur-md p-4 safe-top safe-bottom transition-colors">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-amber-900/15 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-stone-900 dark:text-stone-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-[#fcfaf7] dark:bg-stone-950 border-b border-amber-900/10 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                Готовые шаблоны для жизни
              </h3>
              <p className="text-[11px] text-stone-600 dark:text-stone-400">
                Создайте заполненную страницу в 1 клик
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Templates list */}
        <div className="p-4 overflow-y-auto space-y-3">
          {EVERYDAY_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;

            return (
              <div
                key={tpl.id}
                onClick={() => {
                  onApplyTemplate(tpl);
                  onClose();
                }}
                className="group p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#fffdfa] dark:bg-stone-950/70 hover:border-amber-500/60 dark:hover:border-amber-500/40 hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3 active:scale-99"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl ${tpl.iconBg} ${tpl.iconColor} flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-amber-300 transition truncate">
                      {tpl.title}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-1 mt-0.5">
                      {tpl.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                  <span className="hidden sm:inline">Применить</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
