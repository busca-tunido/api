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
  const runner = await pipeline('text-generation', AI_CONFIG.modelId, {
    dtype: AI_CONFIG.dtype,
    device: AI_CONFIG.device,
  });

  return runner as unknown as GeneratorFunction;
};
