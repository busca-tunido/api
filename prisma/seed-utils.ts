import { PrismaPg } from '@prisma/adapter-pg';
import { type AmenityCategory, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

try {
  process.loadEnvFile?.();
} catch {}

export type ExternalUniversity = {
  name: string;
  domains: string[];
  web_pages: string[];
  country: string;
  'state-province': string | null;
};

export type ExternalCityRaw = {
  name: string;
  lat: string;
  lng: string;
  country: string;
};

export type ValidatedCity = {
  city: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
};

export type AmenityDefinition = {
  slug: string;
  name: string;
  category: AmenityCategory;
  iconKey: string;
};

export const PRIMARY_CITIES: readonly string[] = [
  'Santiago',
  'Valparaíso',
  'Concepción',
  'Valdivia',
];

export const AMENITY_DEFINITIONS: readonly AmenityDefinition[] = [
  {
    slug: 'wifi-alta-velocidad',
    name: 'Wi-Fi fibra óptica alta velocidad',
    category: 'BASIC_UTILITY',
    iconKey: 'wifi',
  },
  {
    slug: 'agua-caliente',
    name: 'Agua caliente 24/7',
    category: 'BASIC_UTILITY',
    iconKey: 'droplet',
  },
  {
    slug: 'luz-incluida',
    name: 'Electricidad incluida en renta',
    category: 'BASIC_UTILITY',
    iconKey: 'zap',
  },
  {
    slug: 'gas-incluido',
    name: 'Gas incluido',
    category: 'BASIC_UTILITY',
    iconKey: 'flame',
  },
  {
    slug: 'calefaccion',
    name: 'Calefacción central o estufa',
    category: 'BASIC_UTILITY',
    iconKey: 'thermometer',
  },
  {
    slug: 'bano-privado',
    name: 'Baño privado en habitación',
    category: 'ROOM_FEATURE',
    iconKey: 'bath',
  },
  {
    slug: 'escritorio-estudio',
    name: 'Escritorio y silla ergonómica',
    category: 'ROOM_FEATURE',
    iconKey: 'monitor',
  },
  {
    slug: 'closet-amplio',
    name: 'Clóset empotrado amplio',
    category: 'ROOM_FEATURE',
    iconKey: 'archive',
  },
  {
    slug: 'cama-plaza-media',
    name: 'Cama 1.5 plazas con colchón nuevo',
    category: 'ROOM_FEATURE',
    iconKey: 'bed',
  },
  {
    slug: 'ventana-exterior',
    name: 'Ventana al exterior con luz natural',
    category: 'ROOM_FEATURE',
    iconKey: 'sun',
  },
  {
    slug: 'cocina-equipada',
    name: 'Cocina compartida full equipada',
    category: 'COMMON_AREA',
    iconKey: 'utensils',
  },
  {
    slug: 'lavadora-secadora',
    name: 'Lavandería (lavadora y secadora)',
    category: 'COMMON_AREA',
    iconKey: 'disc',
  },
  {
    slug: 'living-comedor',
    name: 'Sala de estar y comedor compartido',
    category: 'COMMON_AREA',
    iconKey: 'coffee',
  },
  {
    slug: 'patio-terraza',
    name: 'Terraza / Patio al aire libre',
    category: 'COMMON_AREA',
    iconKey: 'trees',
  },
  {
    slug: 'sala-estudio-cowork',
    name: 'Sala de estudio silenciosa y coworking',
    category: 'STUDY_WORK',
    iconKey: 'book-open',
  },
  {
    slug: 'impresora-scanner',
    name: 'Punto de impresión y escáner',
    category: 'STUDY_WORK',
    iconKey: 'printer',
  },
  {
    slug: 'conserjeria-24-7',
    name: 'Conserjería / Control de acceso 24/7',
    category: 'SAFETY_SECURITY',
    iconKey: 'shield',
  },
  {
    slug: 'camaras-seguridad',
    name: 'Cámaras de vigilancia en accesos',
    category: 'SAFETY_SECURITY',
    iconKey: 'video',
  },
  {
    slug: 'cerradura-digital',
    name: 'Cerradura digital en dormitorios',
    category: 'SAFETY_SECURITY',
    iconKey: 'key',
  },
];

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

export const generateShortName = (name: string): string => {
  const words = name
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 2) return words.join(' ');
  const initials = words
    .filter((w) => !['de', 'del', 'la', 'los', 'las', 'y', 'el'].includes(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join('');
  return initials.slice(0, 10);
};

export const fetchAndValidateUniversities = async (): Promise<ExternalUniversity[]> => {
  const url = 'http://universities.hipolabs.com/search?country=Chile';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `External Universities API failed with status ${res.status}: ${res.statusText}`,
    );
  }
  const data = (await res.json()) as ExternalUniversity[];

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('External Universities API returned an empty or invalid array.');
  }

  for (const uni of data) {
    if (!uni.name || typeof uni.name !== 'string' || uni.name.trim().length <= 3) {
      throw new Error(`Invalid university name received: ${JSON.stringify(uni)}`);
    }
    if (!Array.isArray(uni.domains) || uni.domains.length === 0) {
      throw new Error(`University ${uni.name} has missing or empty domains array.`);
    }
    if (!Array.isArray(uni.web_pages) || uni.web_pages.length === 0) {
      throw new Error(`University ${uni.name} has missing or empty web_pages array.`);
    }
    if (uni.country !== 'Chile') {
      throw new Error(
        `University ${uni.name} country mismatch: expected Chile, got ${uni.country}`,
      );
    }
  }

  return data;
};

export const fetchAndValidateChileCities = async (): Promise<ValidatedCity[]> => {
  const url = 'https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`External Cities API failed with status ${res.status}: ${res.statusText}`);
  }
  const allCities = (await res.json()) as ExternalCityRaw[];
  if (!Array.isArray(allCities) || allCities.length === 0) {
    throw new Error('External Cities API returned an empty or invalid array.');
  }

  const chileCities = allCities.filter((c) => c.country === 'CL');
  if (chileCities.length < 20) {
    throw new Error(`Expected at least 20 Chilean cities, but found only ${chileCities.length}`);
  }

  const validated: ValidatedCity[] = [];
  const foundNames = new Set<string>();

  for (const raw of chileCities) {
    const cityName = raw.name.trim();
    if (!cityName) {
      throw new Error(`Found empty city name in records: ${JSON.stringify(raw)}`);
    }

    const lat = Number(raw.lat);
    const lng = Number(raw.lng);

    if (Number.isNaN(lat) || lat < -56.0 || lat > -17.0) {
      throw new Error(`City ${cityName} has out-of-bounds Chilean latitude: ${raw.lat}`);
    }
    if (Number.isNaN(lng) || lng < -110.0 || lng > -66.0) {
      throw new Error(`City ${cityName} has out-of-bounds Chilean longitude: ${raw.lng}`);
    }

    const normalized = cityName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const isPrimary = PRIMARY_CITIES.some(
      (p) =>
        p
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') === normalized,
    );

    validated.push({
      city: cityName,
      latitude: lat,
      longitude: lng,
      isPrimary,
    });
    foundNames.add(normalized);
  }

  for (const primary of PRIMARY_CITIES) {
    const normalized = primary
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (!foundNames.has(normalized)) {
      throw new Error(`Mandatory primary city missing from external dataset: ${primary}`);
    }
  }

  validated.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.city.localeCompare(b.city);
  });

  return validated.slice(0, 100);
};

export const assignCityToUniversity = (
  uniName: string,
  cities: readonly ValidatedCity[],
): ValidatedCity => {
  const lower = uniName.toLowerCase();
  if (lower.includes('valpara') || lower.includes('playa ancha') || lower.includes('santa mar')) {
    const found = cities.find((c) => c.city.toLowerCase().includes('valpara'));
    if (found) return found;
  }
  if (lower.includes('concepci') || lower.includes('bio') || lower.includes('bío')) {
    const found = cities.find((c) => c.city.toLowerCase().includes('concepci'));
    if (found) return found;
  }
  if (lower.includes('valdivia') || lower.includes('austral')) {
    const found = cities.find((c) => c.city.toLowerCase().includes('valdivia'));
    if (found) return found;
  }
  if (lower.includes('antofagasta') || lower.includes('norte')) {
    const found = cities.find((c) => c.city.toLowerCase().includes('antofagasta'));
    if (found) return found;
  }
  if (lower.includes('temuco') || lower.includes('frontera')) {
    const found = cities.find((c) => c.city.toLowerCase().includes('temuco'));
    if (found) return found;
  }
  const santiago = cities.find((c) => c.city.toLowerCase() === 'santiago');
  return santiago || cities[0];
};

export const createPrismaClient = (): { prisma: PrismaClient; pool: Pool } => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required.');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
};
