import { NearbyStore } from '../types';

export interface LocationInfo {
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  street?: string;
  formattedAddress: string;
  source: 'gps' | 'manual' | 'default';
}

export const MAJOR_CITIES: Record<string, { lat: number; lng: number; name: string }> = {
  moscow: { lat: 55.7558, lng: 37.6173, name: 'Москва' },
  spb: { lat: 59.9343, lng: 30.3351, name: 'Санкт-Петербург' },
  nsk: { lat: 55.0084, lng: 82.9357, name: 'Новосибирск' },
  ekb: { lat: 56.8389, lng: 60.6057, name: 'Екатеринбург' },
  kzn: { lat: 55.7887, lng: 49.1221, name: 'Казань' },
  nn: { lat: 56.3269, lng: 44.0059, name: 'Нижний Новгород' },
  samara: { lat: 53.1959, lng: 50.1002, name: 'Самара' },
  krasnodar: { lat: 45.0355, lng: 38.9753, name: 'Краснодар' },
};

export const POPULAR_CHAINS = [
  { name: 'Пятёрочка', chain: '5ka', baseDistance: 220, hours: '08:00 – 23:00', logo: '🔴', tag: 'Магазин у дома' },
  { name: 'Магнит у дома', chain: 'magnit', baseDistance: 290, hours: '08:00 – 23:00', logo: '🟥', tag: 'Выгодные цены' },
  { name: 'ВкусВилл', chain: 'vkusvill', baseDistance: 410, hours: '08:00 – 22:00', logo: '🟢', tag: 'Натуральные продукты' },
  { name: 'Перекрёсток', chain: 'perekrestok', baseDistance: 550, hours: '08:00 – 23:00', logo: '🍀', tag: 'Широкий выбор' },
  { name: 'Дикси', chain: 'dixy', baseDistance: 480, hours: '08:00 – 23:00', logo: '🟠', tag: 'Акции и скидки' },
  { name: 'Самокат (Даркстор)', chain: 'samokat', baseDistance: 650, hours: '08:00 – 23:00', logo: '🛵', tag: 'Доставка 15 мин' },
  { name: 'Лента Супермаркет', chain: 'lenta', baseDistance: 950, hours: '08:00 – 00:00', logo: '🟡', tag: 'Гипермаркет' },
  { name: 'Ашан Сити', chain: 'auchan', baseDistance: 1400, hours: '08:30 – 22:30', logo: '🐦', tag: 'Большие скидки' },
];

/**
 * Calculates distance formatting
 */
export function formatDistance(meters: number): { distanceText: string; walkMinutes: number } {
  let distanceText = '';
  if (meters < 1000) {
    distanceText = `${Math.round(meters)} м`;
  } else {
    distanceText = `${(meters / 1000).toFixed(1)} км`;
  }
  // Average walking speed ~ 5 km/h = 83 m/min
  const walkMinutes = Math.max(1, Math.round(meters / 80));
  return { distanceText, walkMinutes };
}

/**
 * Reverse geocode coordinates to street and city via OpenStreetMap Nominatim
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<LocationInfo> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'ru, ru-RU;q=0.9, en;q=0.8' },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.municipality || 'Москва';
      const district = addr.suburb || addr.city_district || addr.neighbourhood || '';
      const street = addr.road || addr.street || '';
      const houseNumber = addr.house_number ? `, д. ${addr.house_number}` : '';

      const formatted = [city, district, street ? `${street}${houseNumber}` : '']
        .filter(Boolean)
        .join(', ');

      return {
        lat,
        lng,
        city,
        district,
        street: street ? `${street}${houseNumber}` : undefined,
        formattedAddress: formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        source: 'gps',
      };
    }
  } catch {
    // Ignore network error in preview
  }

  return {
    lat,
    lng,
    city: 'Москва',
    formattedAddress: `Координаты: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    source: 'gps',
  };
}

/**
 * Returns nearby supermarkets based on user coordinates or default center
 */
export function getNearbyStores(userLat?: number, userLng?: number, addressLabel?: string): NearbyStore[] {
  const lat = userLat || 55.7558;
  const lng = userLng || 37.6173;

  return POPULAR_CHAINS.map((c, idx) => {
    // Generate realistic distances based on coordinate seed
    const seed = Math.floor(Math.abs(lat * 1000 + lng * 1000) + idx * 73);
    const jitter = (seed % 200) - 80;
    const distanceMeters = Math.max(120, c.baseDistance + jitter);
    const { distanceText, walkMinutes } = formatDistance(distanceMeters);

    const query = `${c.name} ${addressLabel || ''}`.trim();
    const yandexUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(query)}&ll=${lng},${lat}&z=16`;
    const gisUrl = `https://2gis.ru/search/${encodeURIComponent(c.name)}`;
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name)}&center=${lat},${lng}`;

    return {
      id: `store-${c.chain}-${idx}`,
      name: c.name,
      chain: c.chain,
      distanceMeters,
      distanceText,
      walkMinutes,
      address: addressLabel ? `${addressLabel}, филиал №${idx + 1}` : `ул. Ближайшая, д. ${10 + idx * 4}`,
      isOpen: true,
      workingHours: c.hours,
      mapYandexUrl: yandexUrl,
      map2GisUrl: gisUrl,
      mapGoogleUrl: googleUrl,
    };
  });
}
