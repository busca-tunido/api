import { createPrismaClient } from '../../prisma/seed-utils.js';
import { saveEnrichedTextsCache } from './ai/cache-store.js';
import { createModelPipeline } from './ai/model-runner.js';
import {
  buildPensionDescriptionPrompt,
  buildReviewCommentPrompt,
  buildRoomPrompt,
  cleanGeneratedResponse,
} from './ai/prompt-builder.js';
import { AI_CONFIG, type TierKey } from './config.js';
import type {
  PensionAiPromptContext,
  ReviewAiPromptContext,
  RoomAiPromptContext,
} from './types.js';

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

const run = async (): Promise<void> => {
  assertDevDatabaseOnly();

  console.log('=== Iniciando Enriquecimiento Inteligente de Base de Datos (buscatunido_dev) ===');
  const { prisma } = createPrismaClient();

  const pensions = await prisma.pension.findMany({
    where: { deletedAt: null },
  });

  const reviews = await prisma.review.findMany({
    where: { deletedAt: null },
    include: {
      user: true,
      pension: true,
    },
  });

  if (pensions.length === 0) {
    console.warn(
      'No se encontraron pensiones en buscatunido_dev. Ejecuta primero "pnpm db:seed" para poblar los datos base.',
    );
    return;
  }

  console.log(
    `Detectadas ${pensions.length} pensiones y ${reviews.length} reseñas para enriquecer.`,
  );
  console.log(`Cargando modelo ${AI_CONFIG.modelId} en CPU...`);
  const generator = await createModelPipeline();

  const generatedDescriptions: Record<string, string> = {};
  const generatedReviews: Record<string, string> = {};
  const generatedRooms: Record<string, string> = {};

  console.log(`--- [1/2] Enriqueciendo ${pensions.length} pensiones y sus habitaciones ---`);
  for (let idx = 0; idx < pensions.length; idx++) {
    const pension = pensions[idx];
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

    try {
      const pPrompt = buildPensionDescriptionPrompt(pCtx);
      const pResult = await generator(pPrompt, {
        max_new_tokens: AI_CONFIG.maxNewTokensDescription,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false,
      });

      const pRaw = Array.isArray(pResult) ? pResult[0]?.generated_text || '' : '';
      const pClean = cleanGeneratedResponse(pRaw);
      const finalDescription = pClean.length > 20 ? pClean : pension.description;
      generatedDescriptions[pension.id] = finalDescription;

      const updatedRooms = await Promise.all(
        pension.rooms.map(async (room) => {
          const rCtx: RoomAiPromptContext = {
            id: room.id,
            roomType:
              room.type === 'SINGLE'
                ? 'Pieza individual'
                : room.type === 'SHARED'
                  ? 'Pieza compartida'
                  : 'Estudio independiente',
            hasPrivateBathroom: room.hasPrivateBathroom,
            totalBeds: room.totalBeds,
            city: pension.city,
            neighborhood: pension.neighborhood,
          };

          const rPrompt = buildRoomPrompt(rCtx);
          const rResult = await generator(rPrompt, {
            max_new_tokens: AI_CONFIG.maxNewTokensRoom,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false,
          });

          const rRaw = Array.isArray(rResult) ? rResult[0]?.generated_text || '' : '';
          const rClean = cleanGeneratedResponse(rRaw);
          const roomDesc =
            rClean.length > 15
              ? rClean
              : `Habitación ${room.type.toLowerCase()} con escritorio y clóset. ${room.hasPrivateBathroom ? 'Baño privado.' : 'Baño compartido.'}`;

          generatedRooms[room.id] = roomDesc;

          return {
            ...room,
            description: roomDesc,
          };
        }),
      );

      await prisma.pension.update({
        where: { id: pension.id },
        data: {
          description: finalDescription,
          rooms: updatedRooms,
        },
      });

      if ((idx + 1) % 10 === 0 || idx + 1 === pensions.length) {
        console.log(`Pensiones enriquecidas: ${idx + 1}/${pensions.length}`);
      }
    } catch (err) {
      console.error(`Error enriqueciendo pensión ${pension.id}:`, err);
    }
  }

  console.log(`--- [2/2] Enriqueciendo ${reviews.length} reseñas estudiantiles ---`);
  for (let idx = 0; idx < reviews.length; idx++) {
    const rev = reviews[idx];
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

    try {
      const rPrompt = buildReviewCommentPrompt(rCtx);
      const rResult = await generator(rPrompt, {
        max_new_tokens: AI_CONFIG.maxNewTokensReview,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false,
      });

      const rRaw = Array.isArray(rResult) ? rResult[0]?.generated_text || '' : '';
      const rClean = cleanGeneratedResponse(rRaw);
      const finalComment = rClean.length > 10 ? rClean : rev.comment;
      generatedReviews[rev.id] = finalComment;

      await prisma.review.update({
        where: { id: rev.id },
        data: { comment: finalComment },
      });

      if ((idx + 1) % 25 === 0 || idx + 1 === reviews.length) {
        console.log(`Reseñas enriquecidas: ${idx + 1}/${reviews.length}`);
      }
    } catch (err) {
      console.error(`Error enriqueciendo reseña ${rev.id}:`, err);
    }
  }

  saveEnrichedTextsCache(generatedDescriptions, generatedReviews, generatedRooms);
  console.log('=== Enriquecimiento Completado Exitosamente en MongoDB Atlas ===');
  console.log(`Snapshot de respaldo actualizado en ${AI_CONFIG.enrichedTextsFile}`);
};

run().catch((error: unknown) => {
  console.error('Error fatal durante el enriquecimiento:', error);
  process.exit(1);
});
