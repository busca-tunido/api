import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type AmenityCategory, PrismaClient } from '@prisma/client';

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
  'Viña del Mar',
  'Temuco',
  'Antofagasta',
  'La Serena',
  'Talca',
];

export const AMENITY_DEFINITIONS: readonly AmenityDefinition[] = [
  {
    slug: 'agua-caliente',
    name: 'Agua caliente 24/7',
    category: 'ROOM_FEATURE',
    iconKey: 'droplet',
  },
  {
    slug: 'calefaccion',
    name: 'Calefacción central o estufa',
    category: 'ROOM_FEATURE',
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

const seedDataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'data');
const universitiesCachePath = path.join(seedDataDir, 'chile-universities.json');
const citiesCachePath = path.join(seedDataDir, 'chile-cities.json');

export const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const PRIMARY_CITY_KEYS = new Set(PRIMARY_CITIES.map(normalizeText));

export type FetchCatalogOptions = {
  sync?: boolean;
};

export const fetchAndValidateUniversities = async (
  options?: FetchCatalogOptions,
): Promise<ExternalUniversity[]> => {
  if (!options?.sync && fs.existsSync(universitiesCachePath)) {
    const cached = JSON.parse(
      fs.readFileSync(universitiesCachePath, 'utf-8'),
    ) as ExternalUniversity[];
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

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

  fs.mkdirSync(seedDataDir, { recursive: true });
  fs.writeFileSync(universitiesCachePath, JSON.stringify(data, null, 2));
  return data;
};

export const fetchAndValidateChileCities = async (
  options?: FetchCatalogOptions,
): Promise<ValidatedCity[]> => {
  if (!options?.sync && fs.existsSync(citiesCachePath)) {
    const cached = JSON.parse(fs.readFileSync(citiesCachePath, 'utf-8')) as ValidatedCity[];
    if (Array.isArray(cached) && cached.length >= 20) {
      return cached;
    }
  }

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

    const normalized = normalizeText(cityName);
    const isPrimary = PRIMARY_CITY_KEYS.has(normalized);

    validated.push({
      city: cityName,
      latitude: lat,
      longitude: lng,
      isPrimary,
    });
    foundNames.add(normalized);
  }

  for (const primary of PRIMARY_CITIES) {
    if (!foundNames.has(normalizeText(primary))) {
      throw new Error(`Mandatory primary city missing from external dataset: ${primary}`);
    }
  }

  validated.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.city.localeCompare(b.city);
  });

  fs.mkdirSync(seedDataDir, { recursive: true });
  fs.writeFileSync(citiesCachePath, JSON.stringify(validated, null, 2));
  return validated;
};

type UniversityCityRule = {
  keywords: readonly string[];
  cityFragment: string;
};

const UNIVERSITY_CITY_RULES: readonly UniversityCityRule[] = [
  { keywords: ['valpara', 'playa ancha', 'santa mar'], cityFragment: 'valparaiso' },
  { keywords: ['vina del mar', 'maritima', 'del mar'], cityFragment: 'vina del mar' },
  { keywords: ['concepci', 'bio'], cityFragment: 'concepcion' },
  { keywords: ['valdivia', 'austral'], cityFragment: 'valdivia' },
  { keywords: ['antofagasta', 'norte'], cityFragment: 'antofagasta' },
  { keywords: ['temuco', 'frontera', 'araucan'], cityFragment: 'temuco' },
  { keywords: ['serena', 'coquimbo'], cityFragment: 'serena' },
  { keywords: ['talca', 'maule'], cityFragment: 'talca' },
  { keywords: ['tarapaca', 'arica'], cityFragment: 'arica' },
  { keywords: ['arturo prat', 'iquique'], cityFragment: 'iquique' },
  { keywords: ['atacama', 'copiapo'], cityFragment: 'copiapo' },
  { keywords: ['adventista', 'chillan'], cityFragment: 'chillan' },
  { keywords: ['los lagos', 'osorno'], cityFragment: 'osorno' },
  { keywords: ['magallanes', 'punta arenas'], cityFragment: 'punta arenas' },
  { keywords: ['aysen', 'coyhaique'], cityFragment: 'coyhaique' },
];

export const assignCityToUniversity = (
  uniName: string,
  cities: readonly ValidatedCity[],
): ValidatedCity => {
  const normalizedName = normalizeText(uniName);
  for (const rule of UNIVERSITY_CITY_RULES) {
    if (rule.keywords.some((kw) => normalizedName.includes(kw))) {
      const found = cities.find((c) => normalizeText(c.city).includes(rule.cityFragment));
      if (found) return found;
    }
  }
  const santiago = cities.find((c) => normalizeText(c.city) === 'santiago');
  return santiago || cities[0];
};

export const createPrismaClient = (): { prisma: PrismaClient } => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required.');
  }
  const prisma = new PrismaClient();
  return { prisma };
};

export const chunkArray = <T>(array: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};
