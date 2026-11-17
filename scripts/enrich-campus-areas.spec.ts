import { describe, expect, it } from 'vitest';
import { buildPolygonFromRing, computePolygonCentroid } from './enrich-campus-areas.js';

describe('buildPolygonFromRing', () => {
  it('computes accurate centroid for closed 6-vertex OSM ring without ocean drift', () => {
    const closedRing: [number, number][] = [
      [-70.6685, -33.453],
      [-70.6675, -33.453],
      [-70.6675, -33.4535],
      [-70.668, -33.4538],
      [-70.6685, -33.4535],
      [-70.6685, -33.453],
    ];

    const result = buildPolygonFromRing(closedRing);
    expect(result).not.toBeNull();
    if (!result) return;

    const lats = result.polygon.map((p) => p.latitude);
    const lngs = result.polygon.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    expect(result.centerLat).toBeGreaterThanOrEqual(minLat);
    expect(result.centerLat).toBeLessThanOrEqual(maxLat);
    expect(result.centerLng).toBeGreaterThanOrEqual(minLng);
    expect(result.centerLng).toBeLessThanOrEqual(maxLng);
    expect(result.centerLat).toBeCloseTo(-33.45336, 4);
    expect(result.centerLng).toBeCloseTo(-70.668, 4);
    expect(result.polygon[0]).toEqual(result.polygon[result.polygon.length - 1]);
  });

  it('computes accurate centroid for large OSM rings with sampling step > 1', () => {
    const ring: [number, number][] = [];
    const totalPoints = 72;
    const baseLat = -33.0445;
    const baseLng = -71.6125;
    const radiusLat = 0.001;
    const radiusLng = 0.0012;

    for (let i = 0; i < totalPoints; i++) {
      const angle = (2 * Math.PI * i) / totalPoints;
      ring.push([
        Number((baseLng + radiusLng * Math.cos(angle)).toFixed(6)),
        Number((baseLat + radiusLat * Math.sin(angle)).toFixed(6)),
      ]);
    }
    ring.push(ring[0]);

    const result = buildPolygonFromRing(ring);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.centerLat).toBeCloseTo(baseLat, 3);
    expect(result.centerLng).toBeCloseTo(baseLng, 3);
    expect(result.polygon[0]).toEqual(result.polygon[result.polygon.length - 1]);
  });

  it('returns null for degenerate rings with fewer than 3 unique vertices', () => {
    const degenerate: [number, number][] = [
      [-70.65, -33.44],
      [-70.65, -33.44],
      [-70.65, -33.44],
    ];
    expect(buildPolygonFromRing(degenerate)).toBeNull();
  });
});

describe('computePolygonCentroid', () => {
  it('ignores closing duplicate vertex when averaging centroid', () => {
    const closedPoly = [
      { latitude: -33.44, longitude: -70.65 },
      { latitude: -33.44, longitude: -70.64 },
      { latitude: -33.45, longitude: -70.64 },
      { latitude: -33.45, longitude: -70.65 },
      { latitude: -33.44, longitude: -70.65 },
    ];

    const centroid = computePolygonCentroid(closedPoly);
    expect(centroid).toEqual({
      centerLat: -33.445,
      centerLng: -70.645,
    });
  });
});
