import type { UniversityRecord, ValidatedCity } from './faker-blueprint.js';

export const isPointInPolygon = (
  latitude: number,
  longitude: number,
  polygon: [number, number][],
): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > latitude !== yj > latitude && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const VALPARAISO_BAY_WATER: [number, number][] = [
  [-71.66, -33.0],
  [-71.58, -33.0],
  [-71.582, -33.028],
  [-71.604, -33.043],
  [-71.62, -33.043],
  [-71.628, -33.038],
  [-71.638, -33.025],
  [-71.66, -33.01],
];

const VINA_DEL_MAR_COAST_WATER: [number, number][] = [
  [-71.61, -32.96],
  [-71.545, -32.96],
  [-71.555, -33.0],
  [-71.56, -33.025],
  [-71.582, -33.028],
  [-71.61, -33.028],
];

const ANTOFAGASTA_COAST_WATER: [number, number][] = [
  [-70.5, -23.55],
  [-70.398, -23.55],
  [-70.403, -23.63],
  [-70.408, -23.67],
  [-70.418, -23.72],
  [-70.5, -23.72],
];

const IQUIQUE_COAST_WATER: [number, number][] = [
  [-70.25, -20.17],
  [-70.15, -20.17],
  [-70.155, -20.205],
  [-70.145, -20.245],
  [-70.14, -20.29],
  [-70.25, -20.29],
];

const COQUIMBO_BAY_WATER: [number, number][] = [
  [-71.35, -29.85],
  [-71.265, -29.85],
  [-71.275, -29.92],
  [-71.315, -29.955],
  [-71.35, -29.955],
];

const CONCEPCION_BAYS_WATER: [number, number][] = [
  [-73.18, -36.68],
  [-72.98, -36.68],
  [-73.0, -36.72],
  [-73.08, -36.735],
  [-73.16, -36.76],
  [-73.18, -36.76],
];

const WATER_POLYGONS: [number, number][][] = [
  VALPARAISO_BAY_WATER,
  VINA_DEL_MAR_COAST_WATER,
  ANTOFAGASTA_COAST_WATER,
  IQUIQUE_COAST_WATER,
  COQUIMBO_BAY_WATER,
  CONCEPCION_BAYS_WATER,
];

export const isPointInWater = (latitude: number, longitude: number): boolean => {
  for (const polygon of WATER_POLYGONS) {
    if (isPointInPolygon(latitude, longitude, polygon)) {
      return true;
    }
  }
  return false;
};

type CoastalCityConfig = {
  latRange: [number, number];
  lngRange: [number, number];
};

const COASTAL_OFFSET_CONFIGS: Record<string, CoastalCityConfig> = {
  valparaíso: {
    latRange: [-0.016, -0.003],
    lngRange: [0.004, 0.022],
  },
  'viña del mar': {
    latRange: [-0.012, 0.012],
    lngRange: [0.005, 0.025],
  },
  antofagasta: {
    latRange: [-0.018, 0.018],
    lngRange: [0.006, 0.024],
  },
  iquique: {
    latRange: [-0.018, 0.01],
    lngRange: [0.005, 0.02],
  },
  'la serena': {
    latRange: [-0.015, 0.015],
    lngRange: [0.006, 0.026],
  },
};

const randomInRange = (min: number, max: number): number => min + Math.random() * (max - min);

export const generateSafePensionCoordinates = (
  cityObj: ValidatedCity,
  localUniversities: UniversityRecord[] = [],
): { latitude: number; longitude: number } => {
  const normalizedCity = cityObj.city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const coastalConfig =
    COASTAL_OFFSET_CONFIGS[cityObj.city.toLowerCase()] ?? COASTAL_OFFSET_CONFIGS[normalizedCity];

  const maxAttempts = 40;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let baseLat = cityObj.latitude;
    let baseLng = cityObj.longitude;

    if (localUniversities.length > 0 && Math.random() < 0.7) {
      const anchorUni = localUniversities[Math.floor(Math.random() * localUniversities.length)];
      baseLat = anchorUni.latitude;
      baseLng = anchorUni.longitude;
    }

    let latOffset: number;
    let lngOffset: number;

    if (coastalConfig) {
      latOffset = randomInRange(coastalConfig.latRange[0], coastalConfig.latRange[1]);
      lngOffset = randomInRange(coastalConfig.lngRange[0], coastalConfig.lngRange[1]);
    } else {
      latOffset = (Math.random() - 0.5) * 0.02;
      lngOffset = (Math.random() - 0.5) * 0.02;
    }

    const candidateLat = Number((baseLat + latOffset).toFixed(6));
    const candidateLng = Number((baseLng + lngOffset).toFixed(6));

    if (!isPointInWater(candidateLat, candidateLng)) {
      return { latitude: candidateLat, longitude: candidateLng };
    }
  }

  const fallbackLat = coastalConfig
    ? Number((cityObj.latitude + coastalConfig.latRange[0]).toFixed(6))
    : cityObj.latitude;
  const fallbackLng = coastalConfig
    ? Number((cityObj.longitude + coastalConfig.lngRange[1]).toFixed(6))
    : cityObj.longitude;

  return { latitude: fallbackLat, longitude: fallbackLng };
};
