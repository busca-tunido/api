import { loadStaticCatalogs, persistDatasetToMongo } from './db/mongo-loader.js';
import { generateBlueprintDataset } from './generators/faker-blueprint.js';
import { createPrismaClient, createSqlPrismaClient } from './seed-utils.js';

const run = async (): Promise<void> => {
  const startTime = Date.now();
  const syncCatalogs = process.argv.includes('--sync-catalogs');
  const refreshOsm = process.argv.includes('--refresh-osm');
  const { prisma } = createPrismaClient();
  const { sqlPrisma } = createSqlPrismaClient();

  console.log('=== Iniciando Pipeline Modular de Seeds Híbrido (BuscaTuNido: SQL + NoSQL) ===');

  try {
    const { validCities, universityRecords, amenityRecords } = await loadStaticCatalogs({
      prisma,
      sqlPrisma,
      syncCatalogs,
      refreshOsm,
    });

    console.log('--- Generando Blueprint Fáctico con Catálogo de Situaciones ---');
    const dataset = await generateBlueprintDataset(validCities, universityRecords, amenityRecords);

    console.log('--- Persistiendo dataset híbrido en PostgreSQL y MongoDB Atlas ---');
    await persistDatasetToMongo(dataset, prisma, sqlPrisma);

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== Proceso de seeds híbrido completado exitosamente en ${elapsedSec}s ===`);
  } finally {
    await Promise.all([prisma.$disconnect(), sqlPrisma.$disconnect()]);
  }
};

run().catch((error: unknown) => {
  console.error('Error fatal durante la ejecución del seed:', error);
  process.exit(1);
});
