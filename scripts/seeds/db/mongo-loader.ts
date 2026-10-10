import type { ProposalStatus, ProposalType, ReportReason, ReportStatus } from '@prisma/client';
import {
  AMENITY_DEFINITIONS,
  type AmenityDefinition,
  assignCityToUniversity,
  createPrismaClient,
  fetchAndValidateChileCities,
  fetchAndValidateUniversities,
  generateShortName,
  type ValidatedCity as RawValidatedCity,
} from '../../../prisma/seed-utils.js';
import type {
  AmenityRecord,
  BlueprintDataset,
  UniversityRecord,
  ValidatedCity,
} from '../generators/faker-blueprint.js';

export interface StaticCatalogData {
  validCities: ValidatedCity[];
  universityRecords: UniversityRecord[];
  amenityRecords: AmenityRecord[];
}

export const loadStaticCatalogs = async (): Promise<StaticCatalogData> => {
  const { prisma } = createPrismaClient();

  console.log('--- Limpiando colecciones en MongoDB Atlas ---');
  await prisma.report.deleteMany({});
  await prisma.pensionProposal.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.pension.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.university.deleteMany({});
  await prisma.amenity.deleteMany({});

  console.log('--- Insertando catálogo de amenidades ---');
  const amenityRecords: AmenityRecord[] = await Promise.all(
    AMENITY_DEFINITIONS.map(async (def: AmenityDefinition) => {
      const created = await prisma.amenity.create({
        data: {
          slug: def.slug,
          name: def.name,
          category: def.category,
          iconKey: def.iconKey,
        },
      });
      return {
        id: created.id,
        slug: created.slug,
        name: created.name,
        category: created.category,
      };
    }),
  );

  console.log('--- Obteniendo y validando ciudades y universidades chilenas ---');
  const [rawUniversities, rawCities] = await Promise.all([
    fetchAndValidateUniversities(),
    fetchAndValidateChileCities(),
  ]);

  const validCities: ValidatedCity[] = rawCities.map((c: RawValidatedCity) => ({
    city: c.city,
    latitude: c.latitude,
    longitude: c.longitude,
    isPrimary: c.isPrimary,
  }));

  const universityRecords: UniversityRecord[] = [];
  for (const uni of rawUniversities) {
    const assignedCity = assignCityToUniversity(uni.name, validCities);
    const shortName = generateShortName(uni.name);

    const created = await prisma.university.create({
      data: {
        name: uni.name,
        shortName,
        emailDomains: uni.domains,
        city: assignedCity.city,
        address: `${assignedCity.city} Campus Principal`,
        latitude: assignedCity.latitude,
        longitude: assignedCity.longitude,
      },
    });

    universityRecords.push({
      id: created.id,
      name: created.name,
      shortName: created.shortName,
      emailDomains: created.emailDomains,
      city: created.city,
      latitude: created.latitude,
      longitude: created.longitude,
    });
  }

  return {
    validCities,
    universityRecords,
    amenityRecords,
  };
};

export const persistDatasetToMongo = async (dataset: BlueprintDataset): Promise<void> => {
  const { prisma } = createPrismaClient();

  console.log(`--- Persistiendo ${dataset.users.length} usuarios en MongoDB ---`);
  const userIdMap = new Map<string, string>();

  for (const user of dataset.users) {
    const created = await prisma.user.create({
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isEmailVerified: true,
        avatarUrl: user.avatarUrl,
        universityId: user.universityId,
        deletedAt: null,
      },
    });
    userIdMap.set(user.id, created.id);
  }

  console.log(`--- Persistiendo ${dataset.pensions.length} pensiones en MongoDB ---`);
  const pensionIdMap = new Map<string, string>();

  for (const pension of dataset.pensions) {
    const realLandlordId = userIdMap.get(pension.landlordId);

    const created = await prisma.pension.create({
      data: {
        slug: pension.slug,
        title: pension.title,
        description: pension.description,
        address: pension.address,
        city: pension.city,
        neighborhood: pension.neighborhood,
        latitude: pension.latitude,
        longitude: pension.longitude,
        location: {
          type: 'Point',
          coordinates: [pension.longitude, pension.latitude],
        },
        contactName: pension.contactName,
        contactPhone: pension.contactPhone,
        contactWhatsapp: pension.contactWhatsapp,
        contactEmail: pension.contactEmail,
        baseMonthlyPrice: pension.baseMonthlyPrice,
        deposit: pension.deposit,
        currency: pension.currency,
        waterIncluded: pension.waterIncluded,
        electricityIncluded: pension.electricityIncluded,
        gasIncluded: pension.gasIncluded,
        internetIncluded: pension.internetIncluded,
        curfewTime: pension.curfewTime,
        guestsAllowed: pension.guestsAllowed,
        smokingAllowed: pension.smokingAllowed,
        petsAllowed: pension.petsAllowed,
        genderPreference: pension.genderPreference,
        quietHoursStart: pension.quietHoursStart,
        quietHoursEnd: pension.quietHoursEnd,
        verificationStatus: pension.verificationStatus,
        landlordId: realLandlordId,
        amenities: pension.amenities,
        rooms: pension.rooms.map((r) => ({
          id: r.id,
          roomNumber: r.roomNumber,
          title: r.title,
          description: r.description,
          type: r.type,
          monthlyPrice: r.monthlyPrice,
          deposit: r.deposit,
          hasPrivateBathroom: r.hasPrivateBathroom,
          totalBeds: r.totalBeds,
          availableBeds: r.availableBeds,
          isAvailable: r.isAvailable,
          images: r.images,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })),
        images: pension.images.map((img) => ({
          id: img.id,
          url: img.url,
          thumbnailUrl: img.thumbnailUrl,
          caption: img.caption,
          isFeatured: img.isFeatured,
          sortOrder: img.sortOrder,
          createdAt: new Date(),
        })),
        nearbyUniversities: pension.nearbyUniversities.map((u) => ({
          universityId: u.universityId,
          name: u.name,
          shortName: u.shortName,
          distanceMeters: u.distanceMeters,
          walkingMinutes: u.walkingMinutes,
          transitMinutes: u.transitMinutes,
        })),
      },
    });

    pensionIdMap.set(pension.id, created.id);
  }

  console.log(`--- Persistiendo ${dataset.reviews.length} reseñas en MongoDB ---`);
  const pensionRatingsMap = new Map<string, number[]>();

  for (const review of dataset.reviews) {
    const realPensionId = pensionIdMap.get(review.pensionId);
    const realUserId = userIdMap.get(review.userId);
    if (!realPensionId || !realUserId) continue;

    await prisma.review.create({
      data: {
        pensionId: realPensionId,
        userId: realUserId,
        overallRating: review.overallRating,
        cleanlinessRating: review.cleanlinessRating,
        landlordRating: review.landlordRating,
        quietnessRating: review.quietnessRating,
        wifiRating: review.wifiRating,
        comment: review.comment,
        stayDurationCategory: review.stayDurationCategory,
        isResidentVerified: review.isResidentVerified,
        stayStartDate: new Date('2025-03-01'),
        stayEndDate: new Date('2025-07-15'),
        exactStayDays: 136,
      },
    });

    const currentRatings = pensionRatingsMap.get(realPensionId) || [];
    currentRatings.push(review.overallRating);
    pensionRatingsMap.set(realPensionId, currentRatings);
  }

  console.log('--- Calculando promedios y puntaje bayesiano para cada pensión ---');
  for (const [pensionId, ratings] of pensionRatingsMap.entries()) {
    const sum = ratings.reduce((acc, val) => acc + val, 0);
    const count = ratings.length;
    const avg = Number((sum / count).toFixed(2));

    const priorWeight = 3;
    const priorMean = 3.5;
    const bayesianRating =
      (count / (count + priorWeight)) * avg + (priorWeight / (count + priorWeight)) * priorMean;
    const communityScore = Math.round((bayesianRating / 5.0) * 1000) / 10;

    await prisma.pension.update({
      where: { id: pensionId },
      data: {
        ratingAverage: avg,
        ratingCount: count,
        communityScore,
      },
    });
  }

  console.log('--- Sembrando reportes de moderación y propuestas de prueba ---');
  const pensionIdArray = Array.from(pensionIdMap.values());
  const userIdArray = Array.from(userIdMap.values());

  if (pensionIdArray.length > 0 && userIdArray.length > 0) {
    for (let i = 0; i < 15; i++) {
      await prisma.report.create({
        data: {
          pensionId: pensionIdArray[i % pensionIdArray.length],
          userId: userIdArray[i % userIdArray.length],
          reason: 'INACCURATE_PRICE' as ReportReason,
          description: 'El precio acordado presencialmente no concuerda con la publicación.',
          status: 'PENDING' as ReportStatus,
        },
      });
    }

    await prisma.pensionProposal.create({
      data: {
        pensionId: pensionIdArray[0],
        submittedById: userIdArray[0],
        type: 'AMENITIES_UPDATE' as ProposalType,
        status: 'PENDING' as ProposalStatus,
        proposedChanges: {
          amenitiesToAdd: ['wifi-alta-velocidad', 'calefaccion'],
        },
        submissionNotes: 'Sugerencia de servicios adicionales disponibles en el inmueble.',
      },
    });
  }

  console.log('=== Inserción de base de datos finalizada con éxito ===');
};
