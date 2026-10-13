import { loadEnrichedTextsCache, saveEnrichedTextsCache } from './ai/cache-store.js';
import { createModelPipeline, runBatchInference } from './ai/model-runner.js';
import {
  buildPensionArchetypePrompt,
  buildReviewArchetypePrompt,
  buildRoomArchetypePrompt,
  cleanGeneratedResponse,
  type PensionArchetypeContext,
  type RoomArchetypeContext,
} from './ai/prompt-builder.js';
import { AI_CONFIG, type TierKey } from './config.js';
import { chunkArray, createPrismaClient } from './seed-utils.js';

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
    saveEnrichedTextsCache(generatedDescriptions, generatedReviews, generatedRooms);
    console.log(`Arquetipos generados y asignados para todas las habitaciones en memoria.`);
  } else {
    console.log('Habitaciones recuperadas directamente de la caché en memoria.');
  }

  console.log(
    `--- [2/3] Evaluando Pool de Arquetipos IA para Descripciones de Pensiones (Pendientes: ${pendingPensions.length}) ---`,
  );
  if (pendingPensions.length > 0) {
    const PENSION_VIBES = [
      'silencioso para estudio y concentración',
      'excelente conectividad y cercanía al campus',
      'ambiente familiar acogedor y grata convivencia',
      'espacios modernos, funcionales e independientes',
    ] as const;

    const PENSION_TIERS: TierKey[] = ['alta', 'media', 'baja'];
    const pensionArchetypePool: Record<string, string[]> = {};
    const pensionContexts: Array<PensionArchetypeContext & { key: string }> = [];

    for (const tier of PENSION_TIERS) {
      pensionArchetypePool[tier] = [];
      for (const vibe of PENSION_VIBES) {
        pensionContexts.push({ key: tier, tier, vibe });
      }
    }

    const gen = await getGenerator();
    const pensionPrompts = pensionContexts.map(buildPensionArchetypePrompt);
    const pensionOutputs = await runBatchInference(gen, pensionPrompts, {
      max_new_tokens: AI_CONFIG.maxNewTokensDescription,
    });

    for (let i = 0; i < pensionContexts.length; i++) {
      const clean = cleanGeneratedResponse(pensionOutputs[i] || '');
      const item = pensionContexts[i];
      const desc =
        clean.length > 20
          ? clean
          : `Residencia estudiantil en excelente ubicación con ambiente ${item.vibe}.`;
      pensionArchetypePool[item.key].push(desc);
    }

    pendingPensions.forEach((pension, idx) => {
      const tier: TierKey =
        pension.verificationStatus === 'OFFICIALLY_VERIFIED'
          ? 'alta'
          : pension.verificationStatus === 'COMMUNITY_VERIFIED'
            ? 'media'
            : 'baja';
      const options = pensionArchetypePool[tier] || [];
      const baseDesc =
        options[idx % Math.max(options.length, 1)] ||
        'Residencia universitaria con excelente conectividad.';

      const nearest = pension.nearbyUniversities[0];
      const uniName = nearest?.shortName || nearest?.name || 'la universidad local';
      const walkingText = nearest?.walkingMinutes
        ? `a ${nearest.walkingMinutes} min caminando de ${uniName}`
        : `a pasos de ${uniName}`;
      const rules = pension.curfewTime
        ? `toque de queda ${pension.curfewTime}`
        : 'ambiente tranquilo de estudio';

      const enriched = `${baseDesc} Ubicada en ${pension.neighborhood}, ${pension.city}, ${walkingText}. Cuenta con normas de convivencia claras (${rules}) y atención de ${pension.contactName || 'Anfitrión'}.`;

      generatedDescriptions[pension.id] = enriched;
    });

    saveEnrichedTextsCache(generatedDescriptions, generatedReviews, generatedRooms);
    console.log(
      `Arquetipos generados y asignados para las ${pendingPensions.length} pensiones en memoria.`,
    );
  } else {
    console.log('Descripciones de pensiones recuperadas directamente de la caché.');
  }

  console.log(
    `--- [3/3] Evaluando Pool de Arquetipos IA para Reseñas Estudiantiles (Pendientes: ${pendingReviews.length}) ---`,
  );
  if (pendingReviews.length > 0) {
    const REVIEW_ARCHETYPES = [
      {
        rating: 5,
        sentiment: 'muy satisfecho',
        focus: 'excelente conectividad, amabilidad y comodidad',
      },
      {
        rating: 5,
        sentiment: 'contento',
        focus: 'ambiente de estudio inmejorable y piezas impecables',
      },
      {
        rating: 4,
        sentiment: 'positivo',
        focus: 'buena relación precio-calidad y cercanía al campus',
      },
      {
        rating: 4,
        sentiment: 'conforme',
        focus: 'espacios limpios y servicios siempre funcionando',
      },
      {
        rating: 3,
        sentiment: 'neutral',
        focus: 'cumple con lo básico aunque con detalles menores de mantención',
      },
      {
        rating: 3,
        sentiment: 'regular',
        focus: 'buena ubicación pero algo ruidoso en horas punta',
      },
      {
        rating: 2,
        sentiment: 'disconforme',
        focus: 'problemas de frío y wifi intermitente para estudiar',
      },
      {
        rating: 1,
        sentiment: 'molesto',
        focus: 'mala experiencia con los servicios y poca respuesta del anfitrión',
      },
    ];

    const reviewArchetypePool: Record<number, string[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    const gen = await getGenerator();
    const reviewPrompts = REVIEW_ARCHETYPES.map(buildReviewArchetypePrompt);
    const reviewOutputs = await runBatchInference(gen, reviewPrompts, {
      max_new_tokens: AI_CONFIG.maxNewTokensReview,
    });

    for (let i = 0; i < REVIEW_ARCHETYPES.length; i++) {
      const clean = cleanGeneratedResponse(reviewOutputs[i] || '');
      const item = REVIEW_ARCHETYPES[i];
      const comment =
        clean.length > 10
          ? clean
          : `Experiencia ${item.sentiment} viviendo en la pensión. ${item.focus}.`;
      reviewArchetypePool[item.rating].push(comment);
    }

    pendingReviews.forEach((rev, idx) => {
      const rating = Math.max(1, Math.min(5, rev.overallRating || 4));
      const options = reviewArchetypePool[rating] || [];
      const baseComment =
        options[idx % Math.max(options.length, 1)] ||
        'Buena experiencia para vivir durante el año académico.';

      generatedReviews[rev.id] = baseComment;
    });

    saveEnrichedTextsCache(generatedDescriptions, generatedReviews, generatedRooms);
    console.log(
      `Arquetipos generados y asignados para las ${pendingReviews.length} reseñas en memoria.`,
    );
  } else {
    console.log('Reseñas recuperadas directamente de la caché en memoria.');
  }

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
