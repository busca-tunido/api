import fs from 'node:fs';
import path from 'node:path';
import { AI_CONFIG } from '../config.js';
import type { EnrichedSeedTextsCache } from '../types.js';

export const loadEnrichedTextsCache = (): EnrichedSeedTextsCache | null => {
  if (!fs.existsSync(AI_CONFIG.enrichedTextsFile)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(AI_CONFIG.enrichedTextsFile, 'utf-8');
    const parsed = JSON.parse(raw) as EnrichedSeedTextsCache;
    if (parsed.descriptions && parsed.reviews) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const saveEnrichedTextsCache = (
  descriptions: Record<string, string>,
  reviews: Record<string, string>,
  rooms: Record<string, string> = {},
): void => {
  const dir = path.dirname(AI_CONFIG.enrichedTextsFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const payload: EnrichedSeedTextsCache = {
    version: 1,
    generatedAt: new Date().toISOString(),
    descriptions,
    reviews,
    rooms,
  };

  fs.writeFileSync(AI_CONFIG.enrichedTextsFile, JSON.stringify(payload, null, 2), 'utf-8');
};
