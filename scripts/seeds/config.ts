import path from 'node:path';

export const TIER_MAP = {
  alta: 'high',
  media: 'mid',
  baja: 'budget',
} as const;

export type TierKey = keyof typeof TIER_MAP;

export const TIER_MULTIPLIER: Record<TierKey, number> = {
  alta: 1.25,
  media: 1.0,
  baja: 0.82,
};

export const CURATED_COUNTS = {
  houses: {
    high: 56,
    mid: 56,
    budget: 58,
  },
  rooms: {
    high: 75,
    mid: 75,
    budget: 76,
  },
  profiles: {
    landlords: {
      men: 150,
      women: 150,
    },
    students: {
      men: 150,
      women: 150,
    },
  },
} as const;

export const TOTAL_LANDLORDS = 170;
export const TOTAL_STUDENTS = 220;

export const IMPORTANT_CITY_TARGETS: Record<string, number> = {
  Santiago: 35,
  Valparaíso: 25,
  Concepción: 25,
  'Viña del Mar': 20,
  Valdivia: 20,
  Temuco: 16,
  Antofagasta: 16,
  'La Serena': 15,
  Talca: 12,
};

export const CITY_BASE_MEDIAN: Record<string, number> = {
  Santiago: 290000,
  Valparaíso: 260000,
  'Viña del Mar': 275000,
  Concepción: 240000,
  Valdivia: 250000,
  Temuco: 230000,
  Antofagasta: 310000,
  'La Serena': 255000,
  Talca: 220000,
};

export const CITY_NEIGHBORHOODS: Record<string, string[]> = {
  Santiago: [
    'Santiago Centro',
    'Providencia',
    'Ñuñoa',
    'San Joaquín',
    'Recoleta',
    'Macul',
    'Quinta Normal',
    'Barrio República',
    'Barrio Universitario',
  ],
  Valparaíso: [
    'Cerro Alegre',
    'Cerro Concepción',
    'Playa Ancha',
    'El Plan',
    'Cerro Bellavista',
    'Cerro Barón',
  ],
  'Viña del Mar': [
    'Recreo',
    'Miraflores',
    'Santa Inés',
    'Poniente',
    'Plan de Viña',
    'Gómez Carreño',
    'Chorrillos',
  ],
  Concepción: [
    'Barrio Universitario',
    'Centro',
    'Collao',
    'Plaza Perú',
    'San Pedro de la Paz',
    'Lorenzo Arenas',
    'Agüita de la Perdiz',
  ],
  Valdivia: ['Isla Teja', 'Centro', 'Las Ánimas', 'Regional', 'Miraflores', 'Collico'],
  Temuco: ['Centro', 'Avenida Alemania', 'Pueblo Nuevo', 'Las Encinas', 'Dreves', 'Estación'],
  Antofagasta: ['Coviefi', 'Playa Blanca', 'Centro', 'Parque Inglés', 'Gran Vía', 'Brasil'],
  'La Serena': ['Centro', 'Colina El Pino', 'San Joaquín', 'La Pampa', 'El Milagro', 'La Florida'],
  Talca: ['Centro', 'San Miguel', 'Las Rastras', 'La Florida', 'Lircay'],
};

export const STORAGE_BASE_URL = (
  process.env.PUBLIC_NEON_STORAGE_BASE_URL ||
  'https://br-gentle-butterfly-aevuizs0.storage.c-2.us-east-2.aws.neon.tech/uploads'
).replace(/\/+$/, '');

export const AI_CONFIG = {
  modelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
  dtype: 'q4' as const,
  device: 'cpu' as const,
  maxNewTokensDescription: 55,
  maxNewTokensReview: 35,
  maxNewTokensRoom: 40,
  batchSize: 6,
  cacheDir: path.resolve(process.cwd(), '.cache/huggingface'),
  enrichedTextsFile: path.resolve(process.cwd(), '.cache/enriched-seed-texts.json'),
};
