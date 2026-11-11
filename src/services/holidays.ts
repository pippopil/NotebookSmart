export interface Holiday {
  date: string; // MM-DD format, e.g. "01-01" or "05-09"
  name: string;
  isOfficialNonWorking: boolean;
  countryCode: string;
  emoji?: string;
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  timezones: string[];
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: 'RU', name: 'Россия', flag: '🇷🇺', timezones: ['Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Novosibirsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk', 'Asia/Yakutsk', 'Asia/Vladivostok'] },
  { code: 'BY', name: 'Беларусь', flag: '🇧🇾', timezones: ['Europe/Minsk'] },
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿', timezones: ['Asia/Almaty', 'Asia/Aqtau', 'Asia/Aqtobe', 'Asia/Atyrau', 'Asia/Oral', 'Asia/Qostanay', 'Asia/Qyzylorda'] },
  { code: 'AM', name: 'Армения', flag: '🇦🇲', timezones: ['Asia/Yerevan'] },
  { code: 'GE', name: 'Грузия', flag: '🇬🇪', timezones: ['Asia/Tbilisi'] },
  { code: 'TR', name: 'Турция', flag: '🇹🇷', timezones: ['Europe/Istanbul'] },
  { code: 'AE', name: 'ОАЭ', flag: '🇦🇪', timezones: ['Asia/Dubai'] },
  { code: 'DE', name: 'Германия', flag: '🇩🇪', timezones: ['Europe/Berlin'] },
  { code: 'US', name: 'США', flag: '🇺🇸', timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'] },
  { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿', timezones: ['Asia/Tashkent', 'Asia/Samarkand'] },
  { code: 'RS', name: 'Сербия', flag: '🇷🇸', timezones: ['Europe/Belgrade'] },
  { code: 'TH', name: 'Таиланд', flag: '🇹🇭', timezones: ['Asia/Bangkok'] },
];

/**
 * Official public holidays for supported countries
 */
export const COUNTRY_HOLIDAYS: Record<string, Holiday[]> = {
  RU: [
    { date: '01-01', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'RU', emoji: '🎄' },
    { date: '01-02', name: 'Новогодние каникулы', isOfficialNonWorking: true, countryCode: 'RU', emoji: '❄️' },
    { date: '01-03', name: 'Новогодние каникулы', isOfficialNonWorking: true, countryCode: 'RU', emoji: '❄️' },
    { date: '01-04', name: 'Новогодние каникулы', isOfficialNonWorking: true, countryCode: 'RU', emoji: '❄️' },
    { date: '01-05', name: 'Новогодние каникулы', isOfficialNonWorking: true, countryCode: 'RU', emoji: '❄️' },
    { date: '01-06', name: 'Новогодние каникулы', isOfficialNonWorking: true, countryCode: 'RU', emoji: '❄️' },
    { date: '01-07', name: 'Рождество Христово', isOfficialNonWorking: true, countryCode: 'RU', emoji: '⭐' },
    { date: '01-08', name: 'Новогодние каникулы', isOfficialNonWorking: true, countryCode: 'RU', emoji: '❄️' },
    { date: '02-23', name: 'День защитника Отечества', isOfficialNonWorking: true, countryCode: 'RU', emoji: '🛡️' },
    { date: '03-08', name: 'Международный женский день', isOfficialNonWorking: true, countryCode: 'RU', emoji: '💐' },
    { date: '05-01', name: 'Праздник Весны и Труда', isOfficialNonWorking: true, countryCode: 'RU', emoji: '🌸' },
    { date: '05-09', name: 'День Победы', isOfficialNonWorking: true, countryCode: 'RU', emoji: '🎖️' },
    { date: '06-12', name: 'День России', isOfficialNonWorking: true, countryCode: 'RU', emoji: '🇷🇺' },
    { date: '11-04', name: 'День народного единства', isOfficialNonWorking: true, countryCode: 'RU', emoji: '🤝' },
  ],
  BY: [
    { date: '01-01', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'BY', emoji: '🎄' },
    { date: '01-02', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'BY', emoji: '❄️' },
    { date: '01-07', name: 'Рождество Христово (православное)', isOfficialNonWorking: true, countryCode: 'BY', emoji: '⭐' },
    { date: '03-08', name: 'День женщин', isOfficialNonWorking: true, countryCode: 'BY', emoji: '💐' },
    { date: '05-01', name: 'Праздник труда', isOfficialNonWorking: true, countryCode: 'BY', emoji: '🌸' },
    { date: '05-09', name: 'День Победы', isOfficialNonWorking: true, countryCode: 'BY', emoji: '🎖️' },
    { date: '07-03', name: 'День Независимости Республики Беларусь', isOfficialNonWorking: true, countryCode: 'BY', emoji: '🇧🇾' },
    { date: '11-07', name: 'День Октябрьской революции', isOfficialNonWorking: true, countryCode: 'BY', emoji: '🚩' },
    { date: '12-25', name: 'Рождество Христово (католическое)', isOfficialNonWorking: true, countryCode: 'BY', emoji: '✨' },
  ],
  KZ: [
    { date: '01-01', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🎄' },
    { date: '01-02', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '❄️' },
    { date: '01-07', name: 'Рождество Христово', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '⭐' },
    { date: '03-08', name: 'Международный женский день', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '💐' },
    { date: '03-21', name: 'Наурыз мейрамы', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🌱' },
    { date: '03-22', name: 'Наурыз мейрамы', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🌱' },
    { date: '03-23', name: 'Наурыз мейрамы', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🌱' },
    { date: '05-01', name: 'Праздник единства народа Казахстана', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🤝' },
    { date: '05-07', name: 'День защитника Отечества', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🛡️' },
    { date: '05-09', name: 'День Победы', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🎖️' },
    { date: '07-06', name: 'День Столицы', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🏛️' },
    { date: '08-30', name: 'День Конституции', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '📜' },
    { date: '10-25', name: 'День Республики', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🇰🇿' },
    { date: '12-16', name: 'День Независимости', isOfficialNonWorking: true, countryCode: 'KZ', emoji: '🇰🇿' },
  ],
  AM: [
    { date: '01-01', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'AM', emoji: '🎄' },
    { date: '01-02', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'AM', emoji: '❄️' },
    { date: '01-06', name: 'Рождество и Богоявление', isOfficialNonWorking: true, countryCode: 'AM', emoji: '⭐' },
    { date: '01-28', name: 'День Армии', isOfficialNonWorking: true, countryCode: 'AM', emoji: '🛡️' },
    { date: '03-08', name: 'Международный женский день', isOfficialNonWorking: true, countryCode: 'AM', emoji: '💐' },
    { date: '04-24', name: 'День памяти жертв геноцида', isOfficialNonWorking: true, countryCode: 'AM', emoji: '🕯️' },
    { date: '05-01', name: 'День труда', isOfficialNonWorking: true, countryCode: 'AM', emoji: '🌸' },
    { date: '05-09', name: 'День Победы и Мира', isOfficialNonWorking: true, countryCode: 'AM', emoji: '🎖️' },
    { date: '05-28', name: 'День Первой Республики', isOfficialNonWorking: true, countryCode: 'AM', emoji: '🇦🇲' },
    { date: '07-05', name: 'День Конституции', isOfficialNonWorking: true, countryCode: 'AM', emoji: '📜' },
    { date: '09-21', name: 'День Независимости', isOfficialNonWorking: true, countryCode: 'AM', emoji: '🇦🇲' },
  ],
  GE: [
    { date: '01-01', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'GE', emoji: '🎄' },
    { date: '01-02', name: 'Бедоба (День судьбы)', isOfficialNonWorking: true, countryCode: 'GE', emoji: '✨' },
    { date: '01-07', name: 'Рождество Христово', isOfficialNonWorking: true, countryCode: 'GE', emoji: '⭐' },
    { date: '01-19', name: 'Крещение (Натлисигеба)', isOfficialNonWorking: true, countryCode: 'GE', emoji: '🕊️' },
    { date: '03-03', name: 'День матери', isOfficialNonWorking: true, countryCode: 'GE', emoji: '🌸' },
    { date: '03-08', name: 'Женский день', isOfficialNonWorking: true, countryCode: 'GE', emoji: '💐' },
    { date: '04-09', name: 'День национального единства', isOfficialNonWorking: true, countryCode: 'GE', emoji: '🇬🇪' },
    { date: '05-09', name: 'День Победы над фашизмом', isOfficialNonWorking: true, countryCode: 'GE', emoji: '🎖️' },
    { date: '05-12', name: 'День святого Андрея Первозванного', isOfficialNonWorking: true, countryCode: 'GE', emoji: '⛪' },
    { date: '05-26', name: 'День Независимости Грузии', isOfficialNonWorking: true, countryCode: 'GE', emoji: '🇬🇪' },
    { date: '08-28', name: 'Мариамоба (Успение Богородицы)', isOfficialNonWorking: true, countryCode: 'GE', emoji: '🕊️' },
    { date: '10-14', name: 'Светицховлоба', isOfficialNonWorking: true, countryCode: 'GE', emoji: '⛪' },
    { date: '11-23', name: 'Гиоргоба (День святого Георгия)', isOfficialNonWorking: true, countryCode: 'GE', emoji: '⚔️' },
  ],
  TR: [
    { date: '01-01', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'TR', emoji: '🎄' },
    { date: '04-23', name: 'День национальной независимости и детей', isOfficialNonWorking: true, countryCode: 'TR', emoji: '🎈' },
    { date: '05-01', name: 'День труда и солидарности', isOfficialNonWorking: true, countryCode: 'TR', emoji: '🌸' },
    { date: '05-19', name: 'День памяти Ататюрка, молодежи и спорта', isOfficialNonWorking: true, countryCode: 'TR', emoji: '🏃' },
    { date: '07-15', name: 'День демократии и национального единства', isOfficialNonWorking: true, countryCode: 'TR', emoji: '🇹🇷' },
    { date: '08-30', name: 'День Победы (Zafer Bayramı)', isOfficialNonWorking: true, countryCode: 'TR', emoji: '🎖️' },
    { date: '10-29', name: 'День Республики (Cumhuriyet Bayramı)', isOfficialNonWorking: true, countryCode: 'TR', emoji: '🇹🇷' },
  ],
  AE: [
    { date: '01-01', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'AE', emoji: '🎆' },
    { date: '12-01', name: 'День памяти (Commemoration Day)', isOfficialNonWorking: true, countryCode: 'AE', emoji: '🇦🇪' },
    { date: '12-02', name: 'Национальный день ОАЭ', isOfficialNonWorking: true, countryCode: 'AE', emoji: '🇦🇪' },
    { date: '12-03', name: 'Национальный день ОАЭ (выходной)', isOfficialNonWorking: true, countryCode: 'AE', emoji: '🎉' },
  ],
  DE: [
    { date: '01-01', name: 'Neujahr (Новый год)', isOfficialNonWorking: true, countryCode: 'DE', emoji: '🎉' },
    { date: '05-01', name: 'Tag der Arbeit (День труда)', isOfficialNonWorking: true, countryCode: 'DE', emoji: '🌸' },
    { date: '10-03', name: 'Tag der Deutschen Einheit (День немецкого единства)', isOfficialNonWorking: true, countryCode: 'DE', emoji: '🇩🇪' },
    { date: '12-25', name: '1. Weihnachtstag (Рождество)', isOfficialNonWorking: true, countryCode: 'DE', emoji: '🎄' },
    { date: '12-26', name: '2. Weihnachtstag (Рождество)', isOfficialNonWorking: true, countryCode: 'DE', emoji: '✨' },
  ],
  US: [
    { date: '01-01', name: 'New Year\'s Day', isOfficialNonWorking: true, countryCode: 'US', emoji: '🎉' },
    { date: '06-19', name: 'Juneteenth National Independence Day', isOfficialNonWorking: true, countryCode: 'US', emoji: '🗽' },
    { date: '07-04', name: 'Independence Day', isOfficialNonWorking: true, countryCode: 'US', emoji: '🎆' },
    { date: '11-11', name: 'Veterans Day', isOfficialNonWorking: true, countryCode: 'US', emoji: '🎖️' },
    { date: '12-25', name: 'Christmas Day', isOfficialNonWorking: true, countryCode: 'US', emoji: '🎄' },
  ],
  UZ: [
    { date: '01-01', name: 'Новый год', isOfficialNonWorking: true, countryCode: 'UZ', emoji: '🎄' },
    { date: '01-14', name: 'День защитников Родины', isOfficialNonWorking: false, countryCode: 'UZ', emoji: '🛡️' },
    { date: '03-08', name: 'Международный женский день', isOfficialNonWorking: true, countryCode: 'UZ', emoji: '💐' },
    { date: '03-21', name: 'Навруз байрами', isOfficialNonWorking: true, countryCode: 'UZ', emoji: '🌱' },
    { date: '05-09', name: 'День памяти и почестей', isOfficialNonWorking: true, countryCode: 'UZ', emoji: '🎖️' },
    { date: '09-01', name: 'День Независимости Узбекистана', isOfficialNonWorking: true, countryCode: 'UZ', emoji: '🇺🇿' },
    { date: '10-01', name: 'День учителей и наставников', isOfficialNonWorking: true, countryCode: 'UZ', emoji: '📚' },
    { date: '12-08', name: 'День Конституции', isOfficialNonWorking: true, countryCode: 'UZ', emoji: '📜' },
  ],
  RS: [
    { date: '01-01', name: 'Нова година', isOfficialNonWorking: true, countryCode: 'RS', emoji: '🎄' },
    { date: '01-02', name: 'Нова година', isOfficialNonWorking: true, countryCode: 'RS', emoji: '❄️' },
    { date: '01-07', name: 'Божић (Рождество)', isOfficialNonWorking: true, countryCode: 'RS', emoji: '⭐' },
    { date: '02-15', name: 'Дан државности Србије', isOfficialNonWorking: true, countryCode: 'RS', emoji: '🇷🇸' },
    { date: '02-16', name: 'Дан државности Србије', isOfficialNonWorking: true, countryCode: 'RS', emoji: '🇷🇸' },
    { date: '05-01', name: 'Празник рада', isOfficialNonWorking: true, countryCode: 'RS', emoji: '🌸' },
    { date: '05-02', name: 'Празник рада', isOfficialNonWorking: true, countryCode: 'RS', emoji: '🌸' },
    { date: '11-11', name: 'Дан примирја у Првом светском рату', isOfficialNonWorking: true, countryCode: 'RS', emoji: '🎖️' },
  ],
  TH: [
    { date: '01-01', name: 'New Year\'s Day', isOfficialNonWorking: true, countryCode: 'TH', emoji: '🎉' },
    { date: '04-13', name: 'Songkran (Тайский Новый год)', isOfficialNonWorking: true, countryCode: 'TH', emoji: '💦' },
    { date: '04-14', name: 'Songkran Festival', isOfficialNonWorking: true, countryCode: 'TH', emoji: '💦' },
    { date: '04-15', name: 'Songkran Festival', isOfficialNonWorking: true, countryCode: 'TH', emoji: '💦' },
    { date: '05-01', name: 'National Labour Day', isOfficialNonWorking: true, countryCode: 'TH', emoji: '🌸' },
    { date: '07-28', name: 'King\'s Birthday', isOfficialNonWorking: true, countryCode: 'TH', emoji: '👑' },
    { date: '08-12', name: 'Queen Mother\'s Birthday / Mother\'s Day', isOfficialNonWorking: true, countryCode: 'TH', emoji: '💐' },
    { date: '12-05', name: 'King Bhumibol Adulyadej The Great\'s Birthday / Father\'s Day', isOfficialNonWorking: true, countryCode: 'TH', emoji: '👑' },
    { date: '12-10', name: 'Constitution Day', isOfficialNonWorking: true, countryCode: 'TH', emoji: '📜' },
    { date: '12-31', name: 'New Year\'s Eve', isOfficialNonWorking: true, countryCode: 'TH', emoji: '🎆' },
  ],
};

/**
 * Detects country based on system timezone name
 */
export function detectCountryFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    for (const c of SUPPORTED_COUNTRIES) {
      if (c.timezones.some((t) => tz.includes(t) || t.includes(tz))) {
        return c.code;
      }
    }
    if (tz.includes('Moscow') || tz.includes('Volgograd') || tz.includes('Kirov') || tz.includes('Astrakhan')) return 'RU';
    if (tz.includes('Minsk')) return 'BY';
    if (tz.includes('Almaty')) return 'KZ';
    if (tz.includes('Yerevan')) return 'AM';
    if (tz.includes('Tbilisi')) return 'GE';
    if (tz.includes('Istanbul')) return 'TR';
    if (tz.includes('Dubai')) return 'AE';
    if (tz.includes('Berlin')) return 'DE';
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) return 'US';
    if (tz.includes('Tashkent')) return 'UZ';
    if (tz.includes('Belgrade')) return 'RS';
    if (tz.includes('Bangkok')) return 'TH';
  } catch {}
  return 'RU';
}

/**
 * Retrieves list of holidays for a specific country
 */
export function getCountryHolidays(countryCode: string): Holiday[] {
  return COUNTRY_HOLIDAYS[countryCode] || COUNTRY_HOLIDAYS.RU;
}

/**
 * Checks if a specific date string (YYYY-MM-DD or MM-DD) is a holiday
 */
export function findHolidayForDate(fullDateStr: string, countryCode: string): Holiday | undefined {
  const mmdd = fullDateStr.length >= 10 ? fullDateStr.slice(5, 10) : fullDateStr;
  const holidays = getCountryHolidays(countryCode);
  return holidays.find((h) => h.date === mmdd);
}
