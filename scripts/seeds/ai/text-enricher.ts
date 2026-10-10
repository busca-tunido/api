import { AI_CONFIG } from '../config.js';
import type { BlueprintDataset } from '../generators/faker-blueprint.js';
import {
  extractPensionAiPromptContext,
  extractReviewAiPromptContext,
} from '../generators/faker-blueprint.js';
import { loadEnrichedTextsCache, saveEnrichedTextsCache } from './cache-store.js';
import { createModelPipeline } from './model-runner.js';
import {
  buildPensionDescriptionPrompt,
  buildReviewCommentPrompt,
  cleanGeneratedResponse,
} from './prompt-builder.js';

export interface EnricherOptions {
  skipAi?: boolean;
}

export const enrichDatasetWithAi = async (
  dataset: BlueprintDataset,
  options: EnricherOptions = {},
): Promise<void> => {
  if (options.skipAi) {
    console.log(
      '--- [AI Enricher] Flag --skip-ai activa. Usando descripciones genéricas de Faker ---',
    );
    return;
  }

  const existingCache = loadEnrichedTextsCache();
  if (existingCache) {
    console.log(
      `--- [AI Enricher] Caché detectada (${existingCache.generatedAt}). Aplicando textos instantáneamente ---`,
    );

    let matchedDesc = 0;
    let matchedRev = 0;

    for (const pension of dataset.pensions) {
      if (existingCache.descriptions[pension.id]) {
        pension.description = existingCache.descriptions[pension.id];
        matchedDesc++;
      }
    }

    for (const review of dataset.reviews) {
      if (existingCache.reviews[review.id]) {
        review.comment = existingCache.reviews[review.id];
        matchedRev++;
      }
    }

    console.log(
      `--- [AI Enricher] Caché aplicada: ${matchedDesc} descripciones y ${matchedRev} reseñas enriquecidas ---`,
    );
    return;
  }

  console.log('--- [AI Enricher] Sin caché previa. Inicializando Qwen2.5-0.5B en CPU ---');
  const generator = await createModelPipeline();

  const pensionMap = new Map(dataset.pensions.map((p) => [p.id, p]));
  const generatedDescriptions: Record<string, string> = {};
  const generatedReviews: Record<string, string> = {};

  console.log(
    `--- [AI Enricher] Generando descripciones personalizadas para ${dataset.pensions.length} pensiones ---`,
  );

  const batchSize = AI_CONFIG.batchSize;
  for (let i = 0; i < dataset.pensions.length; i += batchSize) {
    const chunk = dataset.pensions.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (pension) => {
        try {
          const promptCtx = extractPensionAiPromptContext(pension);
          const prompt = buildPensionDescriptionPrompt(promptCtx);
          const result = await generator(prompt, {
            max_new_tokens: AI_CONFIG.maxNewTokensDescription,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false,
          });

          const rawText = Array.isArray(result) ? result[0]?.generated_text || '' : '';
          const cleaned = cleanGeneratedResponse(rawText);
          if (cleaned.length > 15) {
            pension.description = cleaned;
            generatedDescriptions[pension.id] = cleaned;
          }
        } catch (err) {
          console.error(`[AI Enricher Error] Fallo al generar pensión ${pension.id}:`, err);
        }
      }),
    );

    const progress = Math.min(i + batchSize, dataset.pensions.length);
    console.log(`[AI Enricher] Descripciones: ${progress}/${dataset.pensions.length}`);
  }

  console.log(
    `--- [AI Enricher] Generando reseñas contextualizadas para ${dataset.reviews.length} reviews ---`,
  );

  for (let i = 0; i < dataset.reviews.length; i += batchSize) {
    const chunk = dataset.reviews.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (review) => {
        try {
          const pension = pensionMap.get(review.pensionId);
          if (!pension) return;

          const promptCtx = extractReviewAiPromptContext(review, pension);
          const prompt = buildReviewCommentPrompt(promptCtx);
          const result = await generator(prompt, {
            max_new_tokens: AI_CONFIG.maxNewTokensReview,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false,
          });

          const rawText = Array.isArray(result) ? result[0]?.generated_text || '' : '';
          const cleaned = cleanGeneratedResponse(rawText);
          if (cleaned.length > 10) {
            review.comment = cleaned;
            generatedReviews[review.id] = cleaned;
          }
        } catch (err) {
          console.error(`[AI Enricher Error] Fallo al generar reseña ${review.id}:`, err);
        }
      }),
    );

    const progress = Math.min(i + batchSize, dataset.reviews.length);
    console.log(`[AI Enricher] Reseñas: ${progress}/${dataset.reviews.length}`);
  }

  saveEnrichedTextsCache(generatedDescriptions, generatedReviews);
  console.log(
    `--- [AI Enricher] Enriquecimiento completado y guardado en ${AI_CONFIG.enrichedTextsFile} ---`,
  );
};
