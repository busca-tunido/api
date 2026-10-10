import { env, pipeline } from '@huggingface/transformers';
import { AI_CONFIG } from '../config.js';

env.cacheDir = AI_CONFIG.cacheDir;
env.allowLocalModels = true;

export interface GenerationOutputItem {
  generated_text?: string;
}

export type GeneratorFunction = (
  inputs: string | string[],
  options?: {
    max_new_tokens?: number;
    temperature?: number;
    do_sample?: boolean;
    return_full_text?: boolean;
  },
) => Promise<GenerationOutputItem[] | GenerationOutputItem[][]>;

export const createModelPipeline = async (): Promise<GeneratorFunction> => {
  if (
    typeof globalThis !== 'undefined' &&
    'navigator' in globalThis &&
    'gpu' in (globalThis as unknown as { navigator: Record<string, unknown> }).navigator
  ) {
    try {
      const runner = await pipeline('text-generation', AI_CONFIG.modelId, {
        dtype: AI_CONFIG.dtype,
        device: 'webgpu',
      });
      console.log('Aceleración WebGPU activada exitosamente.');
      return runner as unknown as GeneratorFunction;
    } catch {
      console.log('WebGPU no disponible en este entorno, recurriendo a CPU.');
    }
  }

  const runner = await pipeline('text-generation', AI_CONFIG.modelId, {
    dtype: AI_CONFIG.dtype,
    device: 'cpu',
  });

  return runner as unknown as GeneratorFunction;
};

export const runBatchInference = async (
  generator: GeneratorFunction,
  prompts: string[],
  options: {
    max_new_tokens: number;
    temperature?: number;
    do_sample?: boolean;
    return_full_text?: boolean;
  },
): Promise<string[]> => {
  if (prompts.length === 0) return [];
  const results = await generator(prompts, {
    max_new_tokens: options.max_new_tokens,
    temperature: options.temperature ?? 0.7,
    do_sample: options.do_sample ?? true,
    return_full_text: options.return_full_text ?? false,
  });

  return (results as GenerationOutputItem[][]).map((item) => {
    if (Array.isArray(item)) {
      return item[0]?.generated_text || '';
    }
    return (item as GenerationOutputItem)?.generated_text || '';
  });
};
