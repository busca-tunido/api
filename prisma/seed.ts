import {
  AMENITY_DEFINITIONS,
  assignCityToUniversity,
  createPrismaClient,
  fetchAndValidateChileCities,
  fetchAndValidateUniversities,
  generateShortName,
  slugify,
} from './seed-utils.js';

type PublicPensionListing = {
  title: string;
  address: string;
  city: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  baseMonthlyPrice: number;
  description: string;
  rooms: Array<{
    roomNumber: string;
    title: string;
    type: 'SINGLE' | 'SHARED' | 'STUDIO';
    monthlyPrice: number;
    hasPrivateBathroom: boolean;
    totalBeds: number;
    availableBeds: number;
  }>;
};

const PUBLIC_PENSION_DIRECTORY: readonly PublicPensionListing[] = [
  {
    title: 'Residencia Universitaria República',
    address: 'Av. República 420',
    city: 'Santiago',
    neighborhood: 'Barrio Universitario',
    latitude: -33.4502,
    longitude: -70.6675,
    baseMonthlyPrice: 280000,
    description:
      'Residencia estudiantil situada en el corazón del Barrio Universitario de Santiago. Dispone de salas de estudio silenciosas, conectividad a pasos de metro República y servicios básicos integrados.',
    rooms: [
      {
        roomNumber: '101',
        title: 'Habitación Individual Silenciosa',
        type: 'SINGLE',
        monthlyPrice: 280000,
        hasPrivateBathroom: false,
        totalBeds: 1,
        availableBeds: 1,
      },
      {
        roomNumber: '102',
        title: 'Habitación Individual con Baño Privado',
        type: 'SINGLE',
        monthlyPrice: 340000,
        hasPrivateBathroom: true,
        totalBeds: 1,
        availableBeds: 1,
      },
    ],
  },
  {
    title: 'Hogar Estudiantil Cerro Alegre',
    address: 'Calle Almirante Montt 380',
    city: 'Valparaíso',
    neighborhood: 'Cerro Alegre',
    latitude: -33.0441,
    longitude: -71.6289,
    baseMonthlyPrice: 260000,
    description:
      'Casona tradicional acondicionada para estudiantes universitarios, con vista a la bahía, áreas comunes luminosas y rápido acceso a facultades de Valparaíso.',
    rooms: [
      {
        roomNumber: '201',
        title: 'Habitación Vista Bahía',
        type: 'SINGLE',
        monthlyPrice: 270000,
        hasPrivateBathroom: false,
        totalBeds: 1,
        availableBeds: 1,
      },
      {
        roomNumber: '202',
        title: 'Pieza Doble Compartida',
        type: 'SHARED',
        monthlyPrice: 195000,
        hasPrivateBathroom: false,
        totalBeds: 2,
        availableBeds: 2,
      },
    ],
  },
  {
    title: 'Pensión Universitaria Barrio Universitario Concepción',
    address: 'Calle Edmundo Larenas 140',
    city: 'Concepción',
    neighborhood: 'Barrio Universitario',
    latitude: -36.8315,
    longitude: -73.0412,
    baseMonthlyPrice: 250000,
    description:
      'Alojamiento universitario colindante con el campus central de la Universidad de Concepción. Entorno tranquilo y orientado al estudio académico.',
    rooms: [
      {
        roomNumber: 'A1',
        title: 'Estudio Individual Privado',
        type: 'STUDIO',
        monthlyPrice: 320000,
        hasPrivateBathroom: true,
        totalBeds: 1,
        availableBeds: 1,
      },
      {
        roomNumber: 'A2',
        title: 'Habitación Individual Amoblada',
        type: 'SINGLE',
        monthlyPrice: 250000,
        hasPrivateBathroom: false,
        totalBeds: 1,
        availableBeds: 1,
      },
    ],
  },
  {
    title: 'Residencia Isla Teja Valdivia',
    address: 'Calle Los Robles 510',
    city: 'Valdivia',
    neighborhood: 'Isla Teja',
    latitude: -39.8142,
    longitude: -73.2514,
    baseMonthlyPrice: 270000,
    description:
      'Residencia ubicada en Isla Teja a metros del campus Isla Teja de la Universidad Austral de Chile. Cuenta con calefacción central, áreas verdes y ambiente de respeto estudiantil.',
    rooms: [
      {
        roomNumber: '1',
        title: 'Pieza Individual con Calefacción Central',
        type: 'SINGLE',
        monthlyPrice: 270000,
        hasPrivateBathroom: true,
        totalBeds: 1,
        availableBeds: 1,
      },
    ],
  },
];

const main = async (): Promise<void> => {
  const { prisma, pool } = createPrismaClient();

  console.log('--- Production Seed: Validating external registries ---');
  const [universitiesData, citiesData] = await Promise.all([
    fetchAndValidateUniversities(),
    fetchAndValidateChileCities(),
  ]);

  console.log(
    `Resolved ${universitiesData.length} universities and ${citiesData.length} canonical cities.`,
  );

  console.log('--- Production Seed: Cleaning database for clean onboarding ---');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "favorites",
      "reports",
      "reviews",
      "pension_images",
      "rooms",
      "pension_universities",
      "_AmenityToPension",
      "pensions",
      "amenities",
      "users",
      "universities"
    CASCADE;
  `);

  console.log('--- Production Seed: Upserting core catalog amenities ---');
  for (const item of AMENITY_DEFINITIONS) {
    await prisma.amenity.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        category: item.category,
        iconKey: item.iconKey,
      },
      create: {
        slug: item.slug,
        name: item.name,
        category: item.category,
        iconKey: item.iconKey,
      },
    });
  }

  console.log('--- Production Seed: Upserting official universities ---');
  const seededUniversities = [];
  for (let idx = 0; idx < universitiesData.length; idx++) {
    const uni = universitiesData[idx];
    const assignedCity = assignCityToUniversity(uni.name, citiesData);
    const shortName = generateShortName(uni.name);

    const existingUni = await prisma.university.findFirst({ where: { name: uni.name } });
    const record = existingUni
      ? await prisma.university.update({
          where: { id: existingUni.id },
          data: {
            shortName,
            emailDomains: uni.domains,
            city: assignedCity.city,
            address: `${assignedCity.city}, Chile`,
            latitude: assignedCity.latitude,
            longitude: assignedCity.longitude,
          },
        })
      : await prisma.university.create({
          data: {
            name: uni.name,
            shortName,
            emailDomains: uni.domains,
            city: assignedCity.city,
            address: `${assignedCity.city}, Chile`,
            latitude: assignedCity.latitude,
            longitude: assignedCity.longitude,
          },
        });
    seededUniversities.push(record);
  }

  console.log('--- Production Seed: Ingesting unclaimed public directory pensions ---');
  for (const listing of PUBLIC_PENSION_DIRECTORY) {
    const slug = slugify(listing.title);
    const existing = await prisma.pension.findUnique({ where: { slug } });

    if (!existing) {
      const createdPension = await prisma.pension.create({
        data: {
          slug,
          title: listing.title,
          description: listing.description,
          address: listing.address,
          city: listing.city,
          neighborhood: listing.neighborhood,
          latitude: listing.latitude,
          longitude: listing.longitude,
          baseMonthlyPrice: listing.baseMonthlyPrice,
          currency: 'CLP',
          waterIncluded: true,
          electricityIncluded: true,
          gasIncluded: true,
          internetIncluded: true,
          verificationStatus: 'UNVERIFIED',
          ratingAverage: 0,
          ratingCount: 0,
          isActive: true,
          landlordId: null,
          submittedById: null,
          amenities: {
            connect: [
              { slug: 'wifi-alta-velocidad' },
              { slug: 'agua-caliente' },
              { slug: 'luz-incluida' },
              { slug: 'cocina-equipada' },
            ],
          },
        },
      });

      for (const r of listing.rooms) {
        await prisma.room.create({
          data: {
            pensionId: createdPension.id,
            roomNumber: r.roomNumber,
            title: r.title,
            description: `${r.title} en ${listing.title}.`,
            type: r.type,
            monthlyPrice: r.monthlyPrice,
            hasPrivateBathroom: r.hasPrivateBathroom,
            totalBeds: r.totalBeds,
            availableBeds: r.availableBeds,
            isAvailable: true,
            images: [],
          },
        });
      }

      const matchingUni = seededUniversities.find(
        (u) => u.city.toLowerCase() === listing.city.toLowerCase(),
      );
      if (matchingUni) {
        await prisma.pensionUniversity.create({
          data: {
            pensionId: createdPension.id,
            universityId: matchingUni.id,
            distanceMeters: 600,
            walkingMinutes: 8,
            transitMinutes: 4,
          },
        });
      }
    }
  }

  console.log('--- Production Seed: Verifying strict absence of synthetic data ---');
  const userCount = await prisma.user.count();
  const reviewCount = await prisma.review.count();
  const reportCount = await prisma.report.count();
  const favoriteCount = await prisma.favorite.count();

  if (userCount !== 0) {
    throw new Error(`Production seed violation: expected 0 users, found ${userCount}`);
  }
  if (reviewCount !== 0) {
    throw new Error(`Production seed violation: expected 0 reviews, found ${reviewCount}`);
  }
  if (reportCount !== 0) {
    throw new Error(`Production seed violation: expected 0 reports, found ${reportCount}`);
  }
  if (favoriteCount !== 0) {
    throw new Error(`Production seed violation: expected 0 favorites, found ${favoriteCount}`);
  }

  const finalUniCount = await prisma.university.count();
  const finalAmenityCount = await prisma.amenity.count();
  const finalPensionCount = await prisma.pension.count();

  console.log('--- Production Seed Summary ---');
  console.log(`Universities: ${finalUniCount}`);
  console.log(`Amenities: ${finalAmenityCount}`);
  console.log(`Public Pensions: ${finalPensionCount}`);
  console.log(`Synthetic Users: ${userCount} (strictly 0)`);
  console.log(`Synthetic Reviews: ${reviewCount} (strictly 0)`);
  console.log(`Synthetic Reports: ${reportCount} (strictly 0)`);
  console.log(`Synthetic Favorites: ${favoriteCount} (strictly 0)`);

  await prisma.$disconnect();
  await pool.end();
  console.log('--- Production seed completed successfully ---');
};

main().catch(async (e) => {
  console.error('Production seed failed:', e);
  process.exit(1);
});
