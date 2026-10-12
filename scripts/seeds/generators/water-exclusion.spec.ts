import { describe, expect, it } from 'vitest';
import type { UniversityRecord, ValidatedCity } from './faker-blueprint.js';
import {
  generateSafePensionCoordinates,
  isPointInPolygon,
  isPointInWater,
} from './water-exclusion.js';

describe('water-exclusion module', () => {
  it('correctly calculates point-in-polygon with ray-casting', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    expect(isPointInPolygon(5, 5, square)).toBe(true);
    expect(isPointInPolygon(15, 15, square)).toBe(false);
    expect(isPointInPolygon(-5, 5, square)).toBe(false);
  });

  it('detects coordinates in Valparaiso bay as water', () => {
    const oceanBayPoint = { latitude: -33.025, longitude: -71.61 };
    expect(isPointInWater(oceanBayPoint.latitude, oceanBayPoint.longitude)).toBe(true);

    const dryLandPoint = { latitude: -33.048, longitude: -71.612 };
    expect(isPointInWater(dryLandPoint.latitude, dryLandPoint.longitude)).toBe(false);
  });

  it('detects coordinates off the coast of Antofagasta as water', () => {
    const oceanPoint = { latitude: -23.65, longitude: -70.45 };
    expect(isPointInWater(oceanPoint.latitude, oceanPoint.longitude)).toBe(true);

    const inlandPoint = { latitude: -23.65, longitude: -70.38 };
    expect(isPointInWater(inlandPoint.latitude, inlandPoint.longitude)).toBe(false);
  });

  it('generates safe coordinates that never land in water for coastal cities', () => {
    const valparaisoCity: ValidatedCity = {
      city: 'Valparaíso',
      latitude: -33.03932,
      longitude: -71.62728,
      isPrimary: true,
    };

    const mockUniversities: UniversityRecord[] = [
      {
        id: 'mock-pucv',
        name: 'Pontificia Universidad Católica de Valparaíso',
        shortName: 'PUCV',
        emailDomains: ['pucv.cl'],
        city: 'Valparaíso',
        latitude: -33.045,
        longitude: -71.6052,
      },
      {
        id: 'mock-uv',
        name: 'Universidad de Valparaíso',
        shortName: 'UV',
        emailDomains: ['uv.cl'],
        city: 'Valparaíso',
        latitude: -33.044,
        longitude: -71.6195,
      },
    ];

    for (let i = 0; i < 50; i++) {
      const coords = generateSafePensionCoordinates(valparaisoCity, mockUniversities);
      expect(isPointInWater(coords.latitude, coords.longitude)).toBe(false);
      expect(coords.latitude).toBeLessThan(-33.038);
      expect(coords.longitude).toBeGreaterThan(-71.635);
    }
  });

  it('generates valid coordinates for non-coastal cities like Santiago', () => {
    const santiagoCity: ValidatedCity = {
      city: 'Santiago',
      latitude: -33.4489,
      longitude: -70.6693,
      isPrimary: true,
    };

    const coords = generateSafePensionCoordinates(santiagoCity, []);
    expect(isPointInWater(coords.latitude, coords.longitude)).toBe(false);
    expect(coords.latitude).toBeCloseTo(-33.4489, 1);
    expect(coords.longitude).toBeCloseTo(-70.6693, 1);
  });
});
