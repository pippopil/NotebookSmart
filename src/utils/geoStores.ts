import { NearbyStore } from '../types';

export const POPULAR_CHAINS = [
  { name: 'Пятёрочка', chain: '5ka', baseDistance: 250, hours: '08:00 – 23:00' },
  { name: 'ВкусВилл', chain: 'vkusvill', baseDistance: 450, hours: '08:00 – 22:00' },
  { name: 'Магнит у дома', chain: 'magnit', baseDistance: 320, hours: '08:00 – 23:00' },
  { name: 'Перекрёсток', chain: 'perekrestok', baseDistance: 700, hours: '08:00 – 23:00' },
  { name: 'Дикси', chain: 'dixy', baseDistance: 500, hours: '08:00 – 23:00' },
  { name: 'Лента Супермаркет', chain: 'lenta', baseDistance: 1200, hours: '08:00 – 00:00' },
  { name: 'Самокат (Даркстор)', chain: 'samokat', baseDistance: 800, hours: '08:00 – 23:00' },
  { name: 'Ашан Сити', chain: 'auchan', baseDistance: 1800, hours: '08:30 – 22:30' },
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
 * Returns mock/calculated nearby supermarkets based on user coordinates or default center
 */
export function getNearbyStores(userLat?: number, userLng?: number): NearbyStore[] {
  // If GPS coords available, use them with slight deterministic jitter
  return POPULAR_CHAINS.map((c, idx) => {
    // Generate realistic distances
    const jitter = ((idx * 97 + (userLat ? Math.floor(userLat * 100) : 10)) % 150) - 50;
    const distanceMeters = Math.max(150, c.baseDistance + jitter);
    const { distanceText, walkMinutes } = formatDistance(distanceMeters);

    const lat = userLat || 55.7558;
    const lng = userLng || 37.6173;

    const query = `${c.name} рядом`;
    const yandexUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(query)}&ll=${lng},${lat}&z=15`;
    const gisUrl = `https://2gis.ru/search/${encodeURIComponent(c.name)}`;
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name)}&center=${lat},${lng}`;

    return {
      id: `store-${c.chain}-${idx}`,
      name: c.name,
      chain: c.chain,
      distanceMeters,
      distanceText,
      walkMinutes,
      address: `ул. Ближайшая, д. ${10 + idx * 4}`,
      isOpen: true,
      workingHours: c.hours,
      mapYandexUrl: yandexUrl,
      map2GisUrl: gisUrl,
      mapGoogleUrl: googleUrl,
    };
  });
}
