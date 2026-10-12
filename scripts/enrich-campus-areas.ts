import { PrismaClient } from '@prisma/client';

try {
  process.loadEnvFile?.();
} catch {}

type GeoCoordinate = {
  latitude: number;
  longitude: number;
};

type CampusDefinition = {
  name: string;
  acronym: string;
  osmQuery: string;
  fallbackLat: number;
  fallbackLng: number;
  radiusMeters: number;
};

type UniversityCampusMap = {
  universityMatcher: (name: string, shortName: string | null) => boolean;
  campuses: CampusDefinition[];
};

const KNOWN_UNIVERSITY_CAMPUSES: UniversityCampusMap[] = [
  {
    universityMatcher: (name) => /Universidad de Chile/i.test(name),
    campuses: [
      {
        name: 'Facultad de Ciencias Físicas y Matemáticas (Beauchef)',
        acronym: 'FCFM',
        osmQuery:
          'Facultad de Ciencias Fisicas y Matematicas (Universidad de Chile), Tupper, Santiago, Chile',
        fallbackLat: -33.4578,
        fallbackLng: -70.6636,
        radiusMeters: 260,
      },
      {
        name: 'Campus Juan Gómez Millas',
        acronym: 'JGM',
        osmQuery: 'Campus Juan Gómez Millas, Ñuñoa, Chile',
        fallbackLat: -33.4608,
        fallbackLng: -70.5982,
        radiusMeters: 380,
      },
      {
        name: 'Casa Central Universidad de Chile',
        acronym: 'Casa Central',
        osmQuery: 'Casa Central Universidad de Chile, Santiago, Chile',
        fallbackLat: -33.4442,
        fallbackLng: -70.6517,
        radiusMeters: 180,
      },
      {
        name: 'Facultad de Economía y Negocios (FEN)',
        acronym: 'FEN',
        osmQuery:
          'Facultad de Economía y Negocios Universidad de Chile, Diagonal Paraguay, Santiago, Chile',
        fallbackLat: -33.4431,
        fallbackLng: -70.6378,
        radiusMeters: 200,
      },
      {
        name: 'Campus Dra. Eloísa Díaz (Salud)',
        acronym: 'Salud',
        osmQuery: 'Facultad de Medicina Universidad de Chile, Independencia, Chile',
        fallbackLat: -33.4187,
        fallbackLng: -70.6548,
        radiusMeters: 300,
      },
    ],
  },
  {
    universityMatcher: (name) => /Pontificia Universidad Cat[oó]lica de Chile/i.test(name),
    campuses: [
      {
        name: 'Campus San Joaquín UC',
        acronym: 'San Joaquín',
        osmQuery: 'Pontificia Universidad Católica de Chile (Campus San Joaquín), Macul, Chile',
        fallbackLat: -33.4971,
        fallbackLng: -70.6146,
        radiusMeters: 450,
      },
      {
        name: 'Casa Central UC',
        acronym: 'Casa Central',
        osmQuery: 'Casa Central Pontificia Universidad Católica de Chile, Santiago, Chile',
        fallbackLat: -33.4412,
        fallbackLng: -70.6408,
        radiusMeters: 220,
      },
      {
        name: 'Campus Oriente UC',
        acronym: 'Oriente',
        osmQuery: 'Campus Oriente Pontificia Universidad Católica de Chile, Providencia, Chile',
        fallbackLat: -33.4448,
        fallbackLng: -70.5968,
        radiusMeters: 250,
      },
      {
        name: 'Campus Lo Contador UC',
        acronym: 'Lo Contador',
        osmQuery: 'Campus Lo Contador, Providencia, Chile',
        fallbackLat: -33.4182,
        fallbackLng: -70.6195,
        radiusMeters: 200,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad de Santiago de Chile/i.test(name),
    campuses: [
      {
        name: 'Campus Único USACH',
        acronym: 'USACH',
        osmQuery: 'Universidad de Santiago de Chile, Estación Central, Chile',
        fallbackLat: -33.4501,
        fallbackLng: -70.6865,
        radiusMeters: 480,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad de Concepci[oó]n/i.test(name),
    campuses: [
      {
        name: 'Ciudad Universitaria UdeC',
        acronym: 'UdeC',
        osmQuery: 'Universidad de Concepción, Barrio Universitario, Concepción, Chile',
        fallbackLat: -36.8298,
        fallbackLng: -73.0378,
        radiusMeters: 460,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad T[eé]cnica Federico Santa Mar[ií]a/i.test(name),
    campuses: [
      {
        name: 'USM Casa Central',
        acronym: 'USM',
        osmQuery: 'Universidad Técnica Federico Santa María, Valparaíso, Chile',
        fallbackLat: -33.036,
        fallbackLng: -71.595,
        radiusMeters: 320,
      },
      {
        name: 'USM Campus San Joaquín',
        acronym: 'USM-SJ',
        osmQuery: 'Universidad Técnica Federico Santa María Campus Santiago San Joaquín, Chile',
        fallbackLat: -33.4862,
        fallbackLng: -70.6225,
        radiusMeters: 240,
      },
    ],
  },
  {
    universityMatcher: (name) => /Pontificia Universidad Cat[oó]lica de Valpara[ií]so/i.test(name),
    campuses: [
      {
        name: 'PUCV Casa Central',
        acronym: 'PUCV',
        osmQuery: 'Pontificia Universidad Católica de Valparaíso, Valparaíso, Chile',
        fallbackLat: -33.0445,
        fallbackLng: -71.6052,
        radiusMeters: 220,
      },
      {
        name: 'PUCV Campus Curauma',
        acronym: 'Curauma',
        osmQuery: 'Campus Curauma PUCV, Valparaíso, Chile',
        fallbackLat: -33.136,
        fallbackLng: -71.5975,
        radiusMeters: 350,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad Austral de Chile/i.test(name),
    campuses: [
      {
        name: 'Campus Isla Teja UACh',
        acronym: 'Isla Teja',
        osmQuery: 'Universidad Austral de Chile Campus Isla Teja, Valdivia, Chile',
        fallbackLat: -39.8085,
        fallbackLng: -73.2505,
        radiusMeters: 450,
      },
      {
        name: 'Campus Miraflores UACh',
        acronym: 'Miraflores',
        osmQuery: 'Campus Miraflores UACh, Valdivia, Chile',
        fallbackLat: -39.829,
        fallbackLng: -73.242,
        radiusMeters: 280,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad de Valpara[ií]so/i.test(name),
    campuses: [
      {
        name: 'Campus Playa Ancha UV',
        acronym: 'UV',
        osmQuery: 'Universidad de Valparaíso Playa Ancha, Valparaíso, Chile',
        fallbackLat: -33.025,
        fallbackLng: -71.637,
        radiusMeters: 300,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad de Antofagasta/i.test(name),
    campuses: [
      {
        name: 'Campus Coloso UA',
        acronym: 'Coloso',
        osmQuery: 'Universidad de Antofagasta Campus Coloso, Antofagasta, Chile',
        fallbackLat: -23.7025,
        fallbackLng: -70.418,
        radiusMeters: 420,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad de La Serena/i.test(name),
    campuses: [
      {
        name: 'Campus Andrés Bello ULS',
        acronym: 'ULS',
        osmQuery: 'Universidad de La Serena Campus Andrés Bello, La Serena, Chile',
        fallbackLat: -29.9125,
        fallbackLng: -71.238,
        radiusMeters: 360,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad de La Frontera/i.test(name),
    campuses: [
      {
        name: 'Campus Andrés Bello UFRO',
        acronym: 'UFRO',
        osmQuery: 'Universidad de La Frontera Campus Andrés Bello, Temuco, Chile',
        fallbackLat: -38.7475,
        fallbackLng: -72.6165,
        radiusMeters: 420,
      },
    ],
  },
];

function generateFallbackPolygon(
  centerLat: number,
  centerLng: number,
  radiusMeters = 300,
): GeoCoordinate[] {
  const points: GeoCoordinate[] = [];
  const sides = 8;
  const latOffsetPerMeter = 1 / 111320;
  const lngOffsetPerMeter = 1 / (111320 * Math.cos((centerLat * Math.PI) / 180));

  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    const r = radiusMeters * (0.88 + 0.14 * Math.sin(i * 1.7));
    const lat = Number((centerLat + r * Math.sin(angle) * latOffsetPerMeter).toFixed(6));
    const lng = Number((centerLng + r * Math.cos(angle) * lngOffsetPerMeter).toFixed(6));
    points.push({ latitude: lat, longitude: lng });
  }
  points.push(points[0]);
  return points;
}

async function fetchOSMPolygon(
  query: string,
): Promise<{ polygon: GeoCoordinate[]; centerLat: number; centerLng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&q=${encodeURIComponent(query)}&limit=1&countrycodes=cl`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BuscaTuNido/1.0 (contacto@buscatunido.cl)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]?.geojson) return null;

    const geojson = data[0].geojson;
    let coords: [number, number][] = [];

    if (geojson.type === 'Polygon' && Array.isArray(geojson.coordinates[0])) {
      coords = geojson.coordinates[0];
    } else if (geojson.type === 'MultiPolygon' && Array.isArray(geojson.coordinates[0]?.[0])) {
      coords = geojson.coordinates[0][0];
    }

    if (coords.length < 3) return null;

    const step = Math.max(1, Math.floor(coords.length / 28));
    const polygon: GeoCoordinate[] = [];
    let sumLat = 0;
    let sumLng = 0;

    for (let i = 0; i < coords.length; i += step) {
      const lat = Number(coords[i][1].toFixed(6));
      const lng = Number(coords[i][0].toFixed(6));
      polygon.push({ latitude: lat, longitude: lng });
      sumLat += lat;
      sumLng += lng;
    }

    if (
      polygon.length > 0 &&
      (polygon[0].latitude !== polygon[polygon.length - 1].latitude ||
        polygon[0].longitude !== polygon[polygon.length - 1].longitude)
    ) {
      polygon.push(polygon[0]);
    }

    const centerLat = Number((sumLat / (polygon.length - 1 || 1)).toFixed(6));
    const centerLng = Number((sumLng / (polygon.length - 1 || 1)).toFixed(6));

    return { polygon, centerLat, centerLng };
  } catch {
    return null;
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log('=== Iniciando Enriquecimiento de Áreas Universitarias (OSM + Fallback) ===');
  const prisma = new PrismaClient();

  const universities = await prisma.university.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, shortName: true, latitude: true, longitude: true, city: true },
  });

  console.log(`Analizando ${universities.length} universidades...`);

  let enrichedCount = 0;

  for (const uni of universities) {
    const knownConfig = KNOWN_UNIVERSITY_CAMPUSES.find((cfg) =>
      cfg.universityMatcher(uni.name, uni.shortName),
    );

    const campusesData = [];

    if (knownConfig && knownConfig.campuses.length > 0) {
      console.log(
        `\nConfigurando ${knownConfig.campuses.length} campus para [${uni.shortName ?? 'UNI'}] ${uni.name}:`,
      );

      for (const campusDef of knownConfig.campuses) {
        console.log(`  - Buscando OSM para: ${campusDef.name} (${campusDef.acronym})...`);
        const osmResult = await fetchOSMPolygon(campusDef.osmQuery);
        await delay(1100);

        if (osmResult && osmResult.polygon.length >= 4) {
          console.log(`    ✓ Obtenido polígono OSM con ${osmResult.polygon.length} vértices`);
          campusesData.push({
            name: campusDef.name,
            acronym: campusDef.acronym,
            centerLat: osmResult.centerLat,
            centerLng: osmResult.centerLng,
            polygon: osmResult.polygon,
          });
        } else {
          console.log(`    ⚠ OSM no disponible o sin polígono. Generando fallback orgánico.`);
          const fallbackPoly = generateFallbackPolygon(
            campusDef.fallbackLat,
            campusDef.fallbackLng,
            campusDef.radiusMeters,
          );
          campusesData.push({
            name: campusDef.name,
            acronym: campusDef.acronym,
            centerLat: campusDef.fallbackLat,
            centerLng: campusDef.fallbackLng,
            polygon: fallbackPoly,
          });
        }
      }
    } else {
      const acronym =
        uni.shortName ||
        (uni.name.length <= 15
          ? uni.name
          : uni.name
              .split(' ')
              .filter((w) => w.length > 2)
              .map((w) => w[0].toUpperCase())
              .slice(0, 4)
              .join(''));
      const fallbackPoly = generateFallbackPolygon(uni.latitude, uni.longitude, 280);
      campusesData.push({
        name: `${uni.name} - Sede Principal`,
        acronym: acronym.slice(0, 10),
        centerLat: uni.latitude,
        centerLng: uni.longitude,
        polygon: fallbackPoly,
      });
    }

    await prisma.university.update({
      where: { id: uni.id },
      data: { campuses: campusesData },
    });

    enrichedCount++;
  }

  console.log(
    `\n=== Enriquecimiento finalizado exitosamente: ${enrichedCount} universidades actualizadas con áreas y siluetas ===`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error fatal durante el enriquecimiento:', err);
  process.exit(1);
});
