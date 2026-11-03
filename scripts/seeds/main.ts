import { enrichCampusAreas } from '../enrich-campus-areas.js';
import { loadStaticCatalogs, persistDatasetToMongo } from './db/mongo-loader.js';
import { generateBlueprintDataset } from './generators/faker-blueprint.js';

const run = async (): Promise<void> => {
  console.log('=== Iniciando Pipeline Modular de Seeds (BuscaTuNido) ===');

  const { validCities, universityRecords, amenityRecords } = await loadStaticCatalogs();

  console.log('--- Generando Blueprint Fáctico con Catálogo de Situaciones ---');
  const dataset = await generateBlueprintDataset(validCities, universityRecords, amenityRecords);

  console.log('--- Persistiendo dataset completo en MongoDB Atlas ---');
  await persistDatasetToMongo(dataset);

  console.log('--- Enriqueciendo campus universitarios con geometrías y siglas ---');
  await enrichCampusAreas();

  console.log('=== Proceso de seeds completado exitosamente ===');
};

run().catch((error: unknown) => {
  console.error('Error fatal durante la ejecución del seed:', error);
  process.exit(1);
});
