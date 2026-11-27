import type { PrismaClient } from '@prisma/client';
import type {
  ProposalStatus,
  ProposalType,
  ReportReason,
  ReportStatus,
  Prisma as SqlPrisma,
  PrismaClient as SqlPrismaClient,
} from '@prisma/sql-client';
import { loadCampusPolygonCache, resolveUniversityCampuses } from '../../enrich-campus-areas.js';
import {
  type AmenityRecord,
  type BlueprintDataset,
  createDeterministicObjectId,
  type UniversityRecord,
  type ValidatedCity,
} from '../generators/faker-blueprint.js';
import {
  AMENITY_DEFINITIONS,
  assignCityToUniversity,
  chunkArray,
  createPrismaClient,
  createSqlPrismaClient,
  fetchAndValidateChileCities,
  fetchAndValidateUniversities,
  generateShortName,
  type ValidatedCity as RawValidatedCity,
} from '../seed-utils.js';

export type StaticCatalogData = {
  validCities: ValidatedCity[];
  universityRecords: UniversityRecord[];
  amenityRecords: AmenityRecord[];
};

export type LoadCatalogOptions = {
  prisma?: PrismaClient;
  sqlPrisma?: SqlPrismaClient;
  syncCatalogs?: boolean;
  refreshOsm?: boolean;
};

export const loadStaticCatalogs = async (
  options?: LoadCatalogOptions,
): Promise<StaticCatalogData> => {
  const prisma = options?.prisma ?? createPrismaClient().prisma;
  const sqlPrisma = options?.sqlPrisma ?? createSqlPrismaClient().sqlPrisma;
  const shouldDisconnectMongo = !options?.prisma;
  const shouldDisconnectSql = !options?.sqlPrisma;

  try {
    console.log('--- Limpiando colecciones en MongoDB Atlas y tablas en PostgreSQL ---');
    await Promise.all([prisma.review.deleteMany({}), prisma.pension.deleteMany({})]);
    await sqlPrisma.report.deleteMany({});
    await sqlPrisma.pensionProposal.deleteMany({});
    await sqlPrisma.userFavorite.deleteMany({});
    await sqlPrisma.user.deleteMany({});
    await sqlPrisma.campusArea.deleteMany({});
    await sqlPrisma.universityEmailDomain.deleteMany({});
    await sqlPrisma.university.deleteMany({});
    await sqlPrisma.amenity.deleteMany({});

    console.log('--- Insertando catálogo de amenidades en PostgreSQL ---');
    const amenityData = AMENITY_DEFINITIONS.map((def) => ({
      id: createDeterministicObjectId(`amenity-${def.slug}`),
      slug: def.slug,
      name: def.name,
      category: def.category,
      iconKey: def.iconKey,
      deletedAt: null,
    }));

    await sqlPrisma.amenity.createMany({ data: amenityData });

    const amenityRecords: AmenityRecord[] = amenityData.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      category: a.category,
    }));

    console.log('--- Obteniendo y validando ciudades y universidades chilenas ---');
    const [rawUniversities, rawCities] = await Promise.all([
      fetchAndValidateUniversities({ sync: options?.syncCatalogs }),
      fetchAndValidateChileCities({ sync: options?.syncCatalogs }),
    ]);

    const validCities: ValidatedCity[] = rawCities.map((c: RawValidatedCity) => ({
      city: c.city,
      latitude: c.latitude,
      longitude: c.longitude,
      isPrimary: c.isPrimary,
    }));

    const campusCache = options?.refreshOsm ? {} : loadCampusPolygonCache();
    const universityCreateRows: Array<{
      id: string;
      name: string;
      shortName: string | null;
      city: string;
      address: string;
      latitude: number;
      longitude: number;
      deletedAt: null;
    }> = [];

    const emailDomainCreateRows: Array<{
      id: string;
      universityId: string;
      domain: string;
    }> = [];
    const seenDomains = new Set<string>();

    const campusAreaCreateRows: Array<{
      id: string;
      universityId: string;
      name: string;
      acronym: string;
      centerLat: number;
      centerLng: number;
      polygon: SqlPrisma.InputJsonValue;
    }> = [];

    const universityRecords: UniversityRecord[] = [];

    for (let idx = 0; idx < rawUniversities.length; idx++) {
      const uni = rawUniversities[idx];
      const assignedCity = assignCityToUniversity(uni.name, validCities);
      const shortName = generateShortName(uni.name);
      const resolved = await resolveUniversityCampuses(
        {
          name: uni.name,
          shortName,
          latitude: assignedCity.latitude,
          longitude: assignedCity.longitude,
          city: assignedCity.city,
        },
        {
          refreshOsm: options?.refreshOsm,
          cache: campusCache,
        },
      );

      const id = createDeterministicObjectId(`university-${idx}-${uni.name}`);
      universityCreateRows.push({
        id,
        name: uni.name,
        shortName,
        city: assignedCity.city,
        address: `${assignedCity.city} Campus Principal`,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        deletedAt: null,
      });

      const assignedDomains: string[] = [];
      for (const rawDomain of uni.domains) {
        const cleanDomain = rawDomain.toLowerCase().trim();
        if (cleanDomain && !seenDomains.has(cleanDomain)) {
          seenDomains.add(cleanDomain);
          assignedDomains.push(cleanDomain);
          emailDomainCreateRows.push({
            id: createDeterministicObjectId(`uni-domain-${id}-${cleanDomain}`),
            universityId: id,
            domain: cleanDomain,
          });
        }
      }

      for (let cIdx = 0; cIdx < resolved.campuses.length; cIdx++) {
        const campus = resolved.campuses[cIdx];
        campusAreaCreateRows.push({
          id: createDeterministicObjectId(`campus-${id}-${cIdx}-${campus.acronym}`),
          universityId: id,
          name: campus.name,
          acronym: campus.acronym,
          centerLat: campus.centerLat,
          centerLng: campus.centerLng,
          polygon: campus.polygon as unknown as SqlPrisma.InputJsonValue,
        });
      }

      universityRecords.push({
        id,
        name: uni.name,
        shortName,
        emailDomains: assignedDomains.length > 0 ? assignedDomains : uni.domains,
        city: assignedCity.city,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
      });
    }

    for (const batch of chunkArray(universityCreateRows, 50)) {
      await sqlPrisma.university.createMany({ data: batch });
    }

    for (const batch of chunkArray(emailDomainCreateRows, 100)) {
      await sqlPrisma.universityEmailDomain.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    for (const batch of chunkArray(campusAreaCreateRows, 100)) {
      await sqlPrisma.campusArea.createMany({ data: batch });
    }

    return {
      validCities,
      universityRecords,
      amenityRecords,
    };
  } finally {
    if (shouldDisconnectMongo) {
      await prisma.$disconnect();
    }
    if (shouldDisconnectSql) {
      await sqlPrisma.$disconnect();
    }
  }
};

export const persistDatasetToMongo = async (
  dataset: BlueprintDataset,
  prismaClient?: PrismaClient,
  sqlPrismaClient?: SqlPrismaClient,
): Promise<void> => {
  const prisma = prismaClient ?? createPrismaClient().prisma;
  const sqlPrisma = sqlPrismaClient ?? createSqlPrismaClient().sqlPrisma;
  const shouldDisconnectMongo = !prismaClient;
  const shouldDisconnectSql = !sqlPrismaClient;

  try {
    console.log(`--- Persistiendo ${dataset.users.length} usuarios en PostgreSQL ---`);
    const userRows = dataset.users.map((user) => ({
      id: user.id,
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
    }));

    for (const batch of chunkArray(userRows, 100)) {
      await sqlPrisma.user.createMany({ data: batch });
    }

    console.log(`--- Persistiendo ${dataset.pensions.length} pensiones en MongoDB ---`);
    const now = new Date();
    const pensionRows = dataset.pensions.map((pension) => ({
      id: pension.id,
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
      ratingAverage: pension.ratingAverage,
      ratingCount: pension.ratingCount,
      communityScore: pension.communityScore,
      isActive: true,
      landlordId: pension.landlordId,
      amenities: pension.amenities,
      deletedAt: null,
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
        isActive: r.isActive ?? true,
        images: r.images,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })),
      images: pension.images.map((img) => ({
        id: img.id,
        url: img.url,
        thumbnailUrl: img.thumbnailUrl,
        caption: img.caption,
        isFeatured: img.isFeatured,
        sortOrder: img.sortOrder,
        createdAt: now,
      })),
      nearbyUniversities: pension.nearbyUniversities.map((u) => ({
        universityId: u.universityId,
        name: u.name,
        shortName: u.shortName,
        distanceMeters: u.distanceMeters,
        walkingMinutes: u.walkingMinutes,
        transitMinutes: u.transitMinutes,
      })),
    }));

    for (const batch of chunkArray(pensionRows, 50)) {
      await prisma.pension.createMany({ data: batch });
    }

    const favoriteRows: Array<{ userId: string; pensionId: string }> = [];
    for (const user of dataset.users) {
      for (const pensionId of user.favoritePensionIds) {
        favoriteRows.push({ userId: user.id, pensionId });
      }
    }

    if (favoriteRows.length > 0) {
      console.log(`--- Persistiendo ${favoriteRows.length} favoritos en PostgreSQL ---`);
      for (const batch of chunkArray(favoriteRows, 200)) {
        await sqlPrisma.userFavorite.createMany({
          data: batch,
          skipDuplicates: true,
        });
      }
    }

    console.log(`--- Persistiendo ${dataset.reviews.length} reseñas en MongoDB ---`);
    const studentUserIds = dataset.users.filter((u) => u.role === 'STUDENT').map((u) => u.id);
    const stayStart = new Date('2025-03-01');
    const stayEnd = new Date('2025-07-15');

    const reviewRows = dataset.reviews.map((review, idx) => {
      const sampleVotesCount = idx % 5;
      const helpfulUserIds: string[] = [];
      for (let v = 0; v < studentUserIds.length && helpfulUserIds.length < sampleVotesCount; v++) {
        const candidateId = studentUserIds[(idx + v) % studentUserIds.length];
        if (candidateId !== review.userId) {
          helpfulUserIds.push(candidateId);
        }
      }

      return {
        id: review.id,
        pensionId: review.pensionId,
        userId: review.userId,
        overallRating: review.overallRating,
        cleanlinessRating: review.cleanlinessRating,
        landlordRating: review.landlordRating,
        quietnessRating: review.quietnessRating,
        wifiRating: review.wifiRating,
        comment: review.comment,
        images: review.images,
        stayDurationCategory: review.stayDurationCategory,
        isResidentVerified: review.isResidentVerified,
        helpfulUserIds,
        stayStartDate: stayStart,
        stayEndDate: stayEnd,
        exactStayDays: 136,
        deletedAt: null,
      };
    });

    for (const batch of chunkArray(reviewRows, 100)) {
      await prisma.review.createMany({ data: batch });
    }

    console.log('--- Sembrando reportes de moderación y propuestas en PostgreSQL ---');
    if (dataset.pensions.length > 0 && dataset.users.length > 0) {
      const reportRows = Array.from({ length: 15 }, (_, i) => ({
        id: createDeterministicObjectId(`report-${i}`),
        pensionId: dataset.pensions[i % dataset.pensions.length].id,
        userId: dataset.users[i % dataset.users.length].id,
        reason: 'INACCURATE_PRICE' as ReportReason,
        description: 'El precio acordado presencialmente no concuerda con la publicación.',
        status: 'PENDING' as ReportStatus,
        deletedAt: null,
      }));

      await Promise.all([
        sqlPrisma.report.createMany({ data: reportRows }),
        sqlPrisma.pensionProposal.create({
          data: {
            id: createDeterministicObjectId('proposal-0'),
            pensionId: dataset.pensions[0].id,
            submittedById: dataset.users[0].id,
            type: 'AMENITIES_UPDATE' as ProposalType,
            status: 'PENDING' as ProposalStatus,
            proposedChanges: {
              amenitiesToAdd: ['wifi-alta-velocidad', 'calefaccion'],
            },
            submissionNotes: 'Sugerencia de servicios adicionales disponibles en el inmueble.',
          },
        }),
      ]);
    }

    console.log('=== Inserción híbrida (PostgreSQL + MongoDB) finalizada con éxito ===');
  } finally {
    if (shouldDisconnectMongo) {
      await prisma.$disconnect();
    }
    if (shouldDisconnectSql) {
      await sqlPrisma.$disconnect();
    }
  }
};
