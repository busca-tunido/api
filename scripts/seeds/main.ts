import { enrichDatasetWithAi } from './ai/text-enricher.js';
import { loadStaticCatalogs, persistDatasetToMongo } from './db/mongo-loader.js';
import { generateBlueprintDataset } from './generators/faker-blueprint.js';

const run = async (): Promise<void> => {
  const isFastMode = process.argv.includes('--fast') || process.argv.includes('--skip-ai');

  console.log('=== Iniciando Pipeline Modular de Seeds (BuscaTuNido) ===');
  if (isFastMode) {
    console.log('>>> MODO RÁPIDO ACTIVO: Omitiendo enriquecimiento por IA <<<');
  }

  const { validCities, universityRecords, amenityRecords } = await loadStaticCatalogs();

  console.log('--- Generando Blueprint Fáctico con Faker ---');
  const dataset = await generateBlueprintDataset(validCities, universityRecords, amenityRecords);

  console.log('--- Ejecutando etapa de enriquecimiento de textos ---');
  await enrichDatasetWithAi(dataset, { skipAi: isFastMode });

  console.log('--- Persistiendo dataset completo en MongoDB Atlas ---');
  await persistDatasetToMongo(dataset);

  console.log('=== Proceso de seeds completado exitosamente ===');
};

run().catch((error: unknown) => {
  console.error('Error fatal durante la ejecución del seed:', error);
  process.exit(1);
});
