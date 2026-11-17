const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const KM_PER_DEGREE_LAT = 111.32;

export type GeoBoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export const calculateHaversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 10) / 10;
};

export const calculateHaversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * 1000 * c);
};

export const calculateBoundingBox = (
  lat: number,
  lng: number,
  radiusKm: number,
): GeoBoundingBox => {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const cosLat = Math.max(0.1, Math.abs(Math.cos(lat * DEG_TO_RAD)));
  const lngDelta = radiusKm / (KM_PER_DEGREE_LAT * cosLat);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
};

export const calculateWalkingMinutes = (distanceMeters: number): number =>
  Math.round(distanceMeters / 80);

export const calculateTransitMinutes = (distanceMeters: number): number =>
  Math.round(distanceMeters / 250 + 4);
