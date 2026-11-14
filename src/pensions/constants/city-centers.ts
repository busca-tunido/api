export type CityCenter = {
  latitude: number;
  longitude: number;
};

export const CITY_CENTERS: Readonly<Record<string, CityCenter>> = {
  valparaiso: { latitude: -33.0462524, longitude: -71.6198042 },
};

export function findCityCenter(city: string): CityCenter | undefined {
  const normalized = city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return CITY_CENTERS[normalized];
}
