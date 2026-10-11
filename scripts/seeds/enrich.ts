import { loadEnrichedTextsCache, saveEnrichedTextsCache } from './ai/cache-store.js';
import { createModelPipeline, runBatchInference } from './ai/model-runner.js';
import {
  buildPensionDescriptionPrompt,
  buildReviewCommentPrompt,
  buildRoomArchetypePrompt,
  cleanGeneratedResponse,
  type RoomArchetypeContext,
} from './ai/prompt-builder.js';
import { AI_CONFIG, type TierKey } from './config.js';
import { chunkArray, createPrismaClient } from './seed-utils.js';
import type { PensionAiPromptContext, ReviewAiPromptContext } from './types.js';

try {
  process.loadEnvFile?.();
} catch {}

const assertDevDatabaseOnly = (): void => {
  const dbUrl = process.env.DATABASE_URL || '';
  const isDev = /\/buscatunido_dev(?:\?|$)/.test(dbUrl);
  if (!isDev) {
    throw new Error(
      'ACCESO DENEGADO: El script de enriquecimiento por IA solo está permitido en la base de datos "buscatunido_dev". Operación abortada por seguridad.',
    );
  }
};

const ROOM_VIBES = [
  'ambiente tranquilo y luminoso para estudio',
  'espacio cómodo con amplio clóset y escritorio',
  'habitación acogedora con excelente luz natural',
  'ambiente funcional y silencioso para concentración',
] as const;

const ROOM_TYPES = [
  { raw: 'SINGLE', label: 'Pieza individual' },
  { raw: 'SHARED', label: 'Pieza compartida' },
  { raw: 'STUDIO', label: 'Estudio independiente' },
] as const;

const run = async (): Promise<void> => {
  assertDevDatabaseOnly();

  console.log(
    '=== Iniciando Enriquecimiento Optimizado (Batching + Memoria + Gran Update NoSQL) ===',
  );
  const { prisma } = createPrismaClient();

  const notDeleted = {
    OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
  };

  const pensions = await prisma.pension.findMany({
    where: notDeleted,
    select: {
      id: true,
      city: true,
      neighborhood: true,
      verificationStatus: true,
      amenities: true,
      rooms: true,
      curfewTime: true,
      contactName: true,
      nearbyUniversities: true,
      description: true,
    },
  });

  const reviews = await prisma.review.findMany({
    where: notDeleted,
    select: {
      id: true,
      overallRating: true,
      comment: true,
      user: {
        select: {
          firstName: true,
        },
      },
      pension: {
        select: {
          city: true,
          nearbyUniversities: true,
        },
      },
    },
  });

  if (pensions.length === 0) {
    console.warn(
      'No se encontraron pensiones en buscatunido_dev. Ejecuta primero "pnpm db:seed" para poblar los datos base.',
    );
    return;
  }

  console.log(
    `Cargados en memoria: ${pensions.length} pensiones y ${reviews.length} reseñas desde buscatunido_dev.`,
  );

  const existingCache = loadEnrichedTextsCache();
  const generatedDescriptions: Record<string, string> = {
    ...(existingCache?.descriptions || {}),
  };
  const generatedReviews: Record<string, string> = {
    ...(existingCache?.reviews || {}),
  };
  const generatedRooms: Record<string, string> = {
    ...(existingCache?.rooms || {}),
  };

  const pendingPensions = pensions.filter((p) => !generatedDescriptions[p.id]);
  const pendingReviews = reviews.filter((r) => !generatedReviews[r.id]);

  let generator: Awaited<ReturnType<typeof createModelPipeline>> | null = null;
  const getGenerator = async () => {
    if (!generator) {
      console.log(`Inicializando modelo ${AI_CONFIG.modelId}...`);
      generator = await createModelPipeline();
    }
    return generator;
  };

  console.log('--- [1/3] Evaluando Pool de Arquetipos IA para Habitaciones ---');
  const archetypePool: Record<string, string[]> = {};
  const archetypeContexts: Array<RoomArchetypeContext & { key: string }> = [];

  for (const t of ROOM_TYPES) {
    for (const bath of [true, false]) {
      const key = `${t.raw}_${bath ? 'PRIVATE' : 'SHARED'}`;
      archetypePool[key] = [];
      for (const vibe of ROOM_VIBES) {
        archetypeContexts.push({
          key,
          roomType: t.label,
          hasPrivateBathroom: bath,
          vibe,
        });
      }
    }
  }

  const needsRoomArchetypes = pensions.some((p) => p.rooms.some((r) => !generatedRooms[r.id]));

  if (needsRoomArchetypes) {
    const gen = await getGenerator();
    const archetypePrompts = archetypeContexts.map(buildRoomArchetypePrompt);
    const archetypeOutputs = await runBatchInference(gen, archetypePrompts, {
      max_new_tokens: AI_CONFIG.maxNewTokensRoom,
    });

    for (let i = 0; i < archetypeContexts.length; i++) {
      const clean = cleanGeneratedResponse(archetypeOutputs[i] || '');
      const item = archetypeContexts[i];
      const desc =
        clean.length > 15
          ? clean
          : `Habitación ${item.roomType.toLowerCase()} con escritorio y clóset. ${item.hasPrivateBathroom ? 'Baño privado.' : 'Baño compartido.'}`;
      archetypePool[item.key].push(desc);
    }

    for (const p of pensions) {
      p.rooms.forEach((room, roomIdx) => {
        if (!generatedRooms[room.id]) {
          const key = `${room.type}_${room.hasPrivateBathroom ? 'PRIVATE' : 'SHARED'}`;
          const options = archetypePool[key] || [];
          const selected =
            options[roomIdx % Math.max(options.length, 1)] ||
            `Habitación ${room.type.toLowerCase()} con escritorio y clóset. ${room.hasPrivateBathroom ? 'Baño privado.' : 'Baño compartido.'}`;
          generatedRooms[room.id] = selected;
        }
      });
    }
    console.log(`Arquetipos generados y asignados para todas las habitaciones en memoria.`);
  } else {
    console.log('Habitaciones recuperadas directamente de la caché en memoria.');
  }

  console.log(
    `--- [2/3] Procesando Descripciones de Pensiones en Lotes (Pendientes: ${pendingPensions.length}) ---`,
  );
  if (pendingPensions.length > 0) {
    const gen = await getGenerator();
    const pensionBatches = chunkArray(pendingPensions, AI_CONFIG.batchSize);

    for (let b = 0; b < pensionBatches.length; b++) {
      const currentBatch = pensionBatches[b];
      const prompts = currentBatch.map((pension) => {
        const nearest = pension.nearbyUniversities[0];
        const tier: TierKey =
          pension.verificationStatus === 'OFFICIALLY_VERIFIED'
            ? 'alta'
            : pension.verificationStatus === 'COMMUNITY_VERIFIED'
              ? 'media'
              : 'baja';

        const pCtx: PensionAiPromptContext = {
          id: pension.id,
          city: pension.city,
          neighborhood: pension.neighborhood,
          tier,
          nearestUniName: nearest?.shortName || nearest?.name || 'la universidad local',
          walkingMinutes: nearest?.walkingMinutes || 8,
          amenitiesList: pension.amenities.slice(0, 5),
          roomsSummary: `${pension.rooms.length} habitaciones`,
          rulesSummary: pension.curfewTime
            ? `toque de queda ${pension.curfewTime}`
            : 'convivencia estudiantil tranquila',
          landlordName: pension.contactName || 'Anfitrión',
        };

        return buildPensionDescriptionPrompt(pCtx);
      });

      const outputs = await runBatchInference(gen, prompts, {
        max_new_tokens: AI_CONFIG.maxNewTokensDescription,
      });

      for (let i = 0; i < currentBatch.length; i++) {
        const clean = cleanGeneratedResponse(outputs[i] || '');
        generatedDescriptions[currentBatch[i].id] =
          clean.length > 20 ? clean : currentBatch[i].description;
      }

      console.log(
        `Pensiones completadas: ${Math.min((b + 1) * AI_CONFIG.batchSize, pendingPensions.length)}/${pendingPensions.length}`,
      );
    }
  }

  console.log(
    `--- [3/3] Procesando Reseñas Estudiantiles en Lotes (Pendientes: ${pendingReviews.length}) ---`,
  );
  if (pendingReviews.length > 0) {
    const gen = await getGenerator();
    const reviewBatches = chunkArray(pendingReviews, AI_CONFIG.batchSize);

    for (let b = 0; b < reviewBatches.length; b++) {
      const currentBatch = reviewBatches[b];
      const prompts = currentBatch.map((rev) => {
        const userGender =
          rev.user?.firstName &&
          [
            'camila',
            'valentina',
            'sofia',
            'fernanda',
            'javiera',
            'francisca',
            'catalina',
            'isidora',
            'daniela',
            'paula',
            'estudiante',
          ].some((n) => rev.user?.firstName.toLowerCase().includes(n))
            ? 'FEMALE'
            : 'MALE';

        const nearest = rev.pension?.nearbyUniversities?.[0];
        const sentiment =
          rev.overallRating <= 2 ? 'enojado' : rev.overallRating === 3 ? 'neutral' : 'contento';

        const highlightAspect =
          rev.overallRating >= 4
            ? 'excelente conectividad, amabilidad y ambiente de estudio'
            : rev.overallRating === 3
              ? 'cumple lo básico pero hay detalles de mantención'
              : 'problemas de frío, ruidos y wifi intermitente';

        const rCtx: ReviewAiPromptContext = {
          id: rev.id,
          city: rev.pension?.city || 'la ciudad',
          nearestUniName: nearest?.shortName || nearest?.name || 'la universidad',
          authorName: rev.user?.firstName || 'Estudiante',
          authorGender: userGender,
          overallRating: rev.overallRating,
          sentiment,
          highlightAspect,
        };

        return buildReviewCommentPrompt(rCtx);
      });

      const outputs = await runBatchInference(gen, prompts, {
        max_new_tokens: AI_CONFIG.maxNewTokensReview,
      });

      for (let i = 0; i < currentBatch.length; i++) {
        const clean = cleanGeneratedResponse(outputs[i] || '');
        generatedReviews[currentBatch[i].id] = clean.length > 10 ? clean : currentBatch[i].comment;
      }

      console.log(
        `Reseñas completadas: ${Math.min((b + 1) * AI_CONFIG.batchSize, pendingReviews.length)}/${pendingReviews.length}`,
      );
    }
  }

  saveEnrichedTextsCache(generatedDescriptions, generatedReviews, generatedRooms);
  console.log(`Caché local sincronizada en ${AI_CONFIG.enrichedTextsFile}`);

  console.log('=== Ejecutando Gran Update NoSQL por Lotes en MongoDB Atlas ===');
  const nowIso = new Date().toISOString();

  const pensionBulkOps = pensions.map((p) => {
    const finalDescription = generatedDescriptions[p.id] || p.description;
    const updatedRooms = p.rooms.map((room) => ({
      ...room,
      description: generatedRooms[room.id] || room.description,
      createdAt: { $date: new Date(room.createdAt).toISOString() },
      updatedAt: { $date: nowIso },
    }));

    return {
      q: { _id: { $oid: p.id } },
      u: {
        $set: {
          description: finalDescription,
          rooms: updatedRooms,
          updatedAt: { $date: nowIso },
        },
      },
    };
  });

  const pensionChunks = chunkArray(pensionBulkOps, 100);
  for (let i = 0; i < pensionChunks.length; i++) {
    await prisma.$runCommandRaw({
      update: 'pensions',
      updates: pensionChunks[i],
    });
    console.log(
      `Actualización masiva de pensiones: ${Math.min((i + 1) * 100, pensionBulkOps.length)}/${pensionBulkOps.length}`,
    );
  }

  const reviewBulkOps = reviews.map((r) => ({
    q: { _id: { $oid: r.id } },
    u: {
      $set: {
        comment: generatedReviews[r.id] || r.comment,
        updatedAt: { $date: nowIso },
      },
    },
  }));

  const reviewChunks = chunkArray(reviewBulkOps, 200);
  for (let i = 0; i < reviewChunks.length; i++) {
    await prisma.$runCommandRaw({
      update: 'reviews',
      updates: reviewChunks[i],
    });
    console.log(
      `Actualización masiva de reseñas: ${Math.min((i + 1) * 200, reviewBulkOps.length)}/${reviewBulkOps.length}`,
    );
  }

  console.log('=== Enriquecimiento Completado con Éxito en Memoria y MongoDB Atlas ===');
};

run().catch((error: unknown) => {
  console.error('Error fatal durante el enriquecimiento optimizado:', error);
  process.exit(1);
});
