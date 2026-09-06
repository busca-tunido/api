import { fakerES_MX as faker } from '@faker-js/faker';
import {
  type GenderPreference,
  type ReportReason,
  type ReportStatus,
  type Role,
  type RoomType,
  type StayDurationCategory,
  type VerificationStatus,
} from '@prisma/client';
import {
  AMENITY_DEFINITIONS,
  assignCityToUniversity,
  createPrismaClient,
  fetchAndValidateChileCities,
  fetchAndValidateUniversities,
  generateShortName,
  slugify,
} from './seed-utils.js';

const FIXED_REVIEW_IMAGE_URL =
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80';

const ROOM_PHOTOS = [
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
];

const PENSION_TITLES_PREFIXES = [
  'Residencia Universitaria',
  'Pensión Estudiantil',
  'Hogar Universitario',
  'Hostal de Estudiantes',
  'Casona Universitaria',
  'Residencia Juvenil',
  'Campus Living',
];

const REVIEW_COMMENTS = [
  'Excelente ubicación, a pasos de la universidad. El ambiente es muy tranquilo y propicio para estudiar. Los gastos comunes siempre fueron respetados y el internet nunca falló.',
  'Muy buena experiencia durante mi semestre académico. La dueña es muy amable y siempre atenta a cualquier necesidad. Las áreas comunes siempre limpias.',
  'La pensión está muy bien equipada, con cocina amplia y buena calefacción para el invierno. El barrio es seguro de noche para volver caminando.',
  'Lugar acogedor y ordenado. La convivencia entre compañeros fue excelente. Recomiendo totalmente las piezas con baño privado.',
  'Buena relación calidad-precio. El internet de alta velocidad es real y funcionó perfecto para clases online y proyectos.',
  'Instalaciones limpias, ambiente silencioso en horarios de estudio. Muy conforme con la estadía durante todo el año.',
  'Aceptable, aunque a veces el agua caliente tardaba en salir en la mañana. En general buena pensión y anfitrión cordial.',
  'Muy cerca del metro y del campus. Barrio con muchos servicios, supermercados y farmacias a mano.',
];

const main = async (): Promise<void> => {
  const { prisma, pool } = createPrismaClient();

  console.log('--- Step 1: Querying external APIs with strict validations ---');
  const [rawUniversities, validCities] = await Promise.all([
    fetchAndValidateUniversities(),
    fetchAndValidateChileCities(),
  ]);

  console.log(
    `Validated ${rawUniversities.length} universities and ${validCities.length} Chilean cities.`,
  );

  console.log('--- Step 2: Cleaning database ---');
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

  console.log('--- Step 3: Seeding amenities & administrative accounts ---');
  const amenityRecords = [];
  for (const item of AMENITY_DEFINITIONS) {
    const record = await prisma.amenity.create({ data: item });
    amenityRecords.push(record);
  }

  const defaultPasswordHash = '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ekEY58Eb67980EbGO';

  await prisma.user.create({
    data: {
      email: 'admin@buscatunido.cl',
      passwordHash: defaultPasswordHash,
      firstName: 'Administrador',
      lastName: 'General',
      phone: '+56911223344',
      role: 'ADMIN' as Role,
      isEmailVerified: true,
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
  });

  await prisma.user.create({
    data: {
      email: 'moderador@buscatunido.cl',
      passwordHash: defaultPasswordHash,
      firstName: 'Moderador',
      lastName: 'Comunidad',
      phone: '+56922334455',
      role: 'MODERATOR' as Role,
      isEmailVerified: true,
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    },
  });

  console.log('--- Step 4: Seeding universities ---');
  const universityRecords = [];
  const selectedUnis = rawUniversities.slice(0, 35);
  for (let idx = 0; idx < selectedUnis.length; idx++) {
    const uni = selectedUnis[idx];
    const assignedCity = assignCityToUniversity(uni.name, validCities);
    const jitterLat = (Math.random() - 0.5) * 0.02;
    const jitterLng = (Math.random() - 0.5) * 0.02;

    const createdUni = await prisma.university.create({
      data: {
        name: uni.name,
        shortName: generateShortName(uni.name),
        emailDomains: uni.domains.length > 0 ? uni.domains : [`uni${idx + 1}.cl`],
        city: assignedCity.city,
        address: `${faker.location.street()}, ${assignedCity.city}`,
        latitude: assignedCity.latitude + jitterLat,
        longitude: assignedCity.longitude + jitterLng,
      },
    });
    universityRecords.push(createdUni);
  }

  const uniCount = await prisma.university.count();
  if (uniCount < selectedUnis.length) {
    throw new Error(
      `University assertion failed: expected at least ${selectedUnis.length} universities, found ${uniCount}`,
    );
  }

  console.log('--- Step 5: Seeding hundreds of landlord users ---');
  const landlordUsers = [];
  const TOTAL_LANDLORDS = 120;
  for (let i = 1; i <= TOTAL_LANDLORDS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const landlord = await prisma.user.create({
      data: {
        email: `arrendador${i}@buscatunido.cl`,
        passwordHash: defaultPasswordHash,
        firstName,
        lastName,
        phone: `+569${faker.string.numeric(8)}`,
        role: 'LANDLORD' as Role,
        isEmailVerified: true,
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + i * 45000000}?auto=format&fit=crop&w=300&q=80`,
      },
    });
    landlordUsers.push(landlord);
  }

  console.log('--- Step 6: Seeding pensions concentrated in primary cities ---');
  const primaryCityRecords = validCities.filter((c) => c.isPrimary);
  const secondaryCityRecords = validCities.filter((c) => !c.isPrimary);

  const TOTAL_PENSIONS = 280;
  const pensionRecords = [];
  const allRooms = [];
  const allImages = [];
  const allPensionUnis = [];

  for (let i = 0; i < TOTAL_PENSIONS; i++) {
    const isPrimaryTarget = i < Math.floor(TOTAL_PENSIONS * 0.85);
    const targetCity = isPrimaryTarget
      ? faker.helpers.arrayElement(primaryCityRecords)
      : faker.helpers.arrayElement(secondaryCityRecords);

    const nearbyUnisInCity = universityRecords.filter(
      (u) => u.city.toLowerCase() === targetCity.city.toLowerCase(),
    );
    const assignedUni =
      nearbyUnisInCity.length > 0
        ? faker.helpers.arrayElement(nearbyUnisInCity)
        : universityRecords[i % universityRecords.length];

    const landlord = landlordUsers[i % landlordUsers.length];
    const prefix = faker.helpers.arrayElement(PENSION_TITLES_PREFIXES);
    const street = faker.location.street();
    const title = `${prefix} ${targetCity.city} ${street}`;
    const slug = `${slugify(title)}-${i + 1}`;

    const offsetLat = (Math.random() - 0.5) * 0.025;
    const offsetLng = (Math.random() - 0.5) * 0.025;
    const pLat = targetCity.latitude + offsetLat;
    const pLng = targetCity.longitude + offsetLng;

    const basePrice = faker.helpers.arrayElement([
      190000, 220000, 240000, 260000, 280000, 310000, 340000, 380000, 420000,
    ]);
    const hasDeposit = faker.datatype.boolean(0.7);
    const depositAmount = hasDeposit ? basePrice : null;

    const genderPref = faker.helpers.arrayElement([
      'ANY',
      'ANY',
      'FEMALE_ONLY',
      'ANY',
      'MALE_ONLY',
    ]) as GenderPreference;

    const verification = faker.helpers.arrayElement([
      'OFFICIALLY_VERIFIED',
      'COMMUNITY_VERIFIED',
      'OFFICIALLY_VERIFIED',
      'UNVERIFIED',
    ]) as VerificationStatus;

    const selectedAmenities = faker.helpers.arrayElements(amenityRecords, { min: 4, max: 10 });
    const pensionId = faker.string.uuid();

    const createdPension = await prisma.pension.create({
      data: {
        id: pensionId,
        slug,
        title,
        description: `Excelente pensión para estudiantes ubicada en ${targetCity.city}, con conectividad directa a centros de estudio. Cuenta con grato ambiente de estudio, cocina completamente equipada, dormitorios iluminados y servicios básicos incluidos en la renta. Barrio seguro y locomoción expedita.`,
        address: `${street} ${faker.number.int({ min: 100, max: 2900 })}`,
        city: targetCity.city,
        neighborhood: targetCity.city,
        latitude: pLat,
        longitude: pLng,
        contactName: `${landlord.firstName} ${landlord.lastName}`,
        contactPhone: landlord.phone,
        contactWhatsapp: landlord.phone,
        contactEmail: landlord.email,
        baseMonthlyPrice: basePrice,
        deposit: depositAmount,
        currency: 'CLP',
        waterIncluded: true,
        electricityIncluded: true,
        gasIncluded: faker.datatype.boolean(0.85),
        internetIncluded: true,
        curfewTime: faker.helpers.arrayElement([null, null, '23:00', '00:00', '01:00']),
        guestsAllowed: faker.datatype.boolean(0.6),
        smokingAllowed: faker.datatype.boolean(0.15),
        petsAllowed: faker.datatype.boolean(0.2),
        genderPreference: genderPref,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        verificationStatus: verification,
        ratingAverage: 0,
        ratingCount: 0,
        isActive: true,
        landlordId: landlord.id,
        submittedById: landlord.id,
        amenities: {
          connect: selectedAmenities.map((a) => ({ id: a.id })),
        },
      },
    });

    pensionRecords.push({ ...createdPension, isPrimary: isPrimaryTarget });

    if (isPrimaryTarget) {
      const distMeters = faker.number.int({ min: 250, max: 2400 });
      const walkMin = Math.round(distMeters / 80);
      const transMin = Math.round(distMeters / 250) + 4;

      allPensionUnis.push({
        pensionId: createdPension.id,
        universityId: assignedUni.id,
        distanceMeters: distMeters,
        walkingMinutes: walkMin,
        transitMinutes: transMin,
      });
    }

    const numImages = faker.number.int({ min: 3, max: 6 });
    const pickedImages = faker.helpers.arrayElements(ROOM_PHOTOS, numImages);
    for (let imgIndex = 0; imgIndex < pickedImages.length; imgIndex++) {
      allImages.push({
        pensionId: createdPension.id,
        url: pickedImages[imgIndex],
        caption: imgIndex === 0 ? 'Fachada y vista general' : `Área interior ${imgIndex}`,
        isFeatured: imgIndex === 0,
        sortOrder: imgIndex,
      });
    }

    const numRooms = faker.number.int({ min: 2, max: 5 });
    for (let r = 1; r <= numRooms; r++) {
      const roomType = faker.helpers.arrayElement([
        'SINGLE',
        'SINGLE',
        'SHARED',
        'STUDIO',
      ]) as RoomType;
      const hasPrivateBath = roomType === 'STUDIO' ? true : faker.datatype.boolean(0.4);
      const modifier = roomType === 'SHARED' ? -30000 : roomType === 'STUDIO' ? 50000 : 0;
      const roomPrice = Math.max(150000, basePrice + modifier);

      allRooms.push({
        pensionId: createdPension.id,
        roomNumber: `Hab ${r * 10 + r}`,
        title: `Habitación ${roomType === 'SINGLE' ? 'Individual' : roomType === 'SHARED' ? 'Compartida' : 'Estudio'} #${r}`,
        description: `Habitación amoblada para estudiantes con cama, escritorio y clóset. ${hasPrivateBath ? 'Baño privado.' : 'Baño compartido.'}`,
        type: roomType,
        monthlyPrice: roomPrice,
        deposit: hasDeposit ? roomPrice : null,
        hasPrivateBathroom: hasPrivateBath,
        totalBeds: roomType === 'SHARED' ? 2 : 1,
        availableBeds: 1,
        isAvailable: faker.datatype.boolean(0.8),
        images: faker.helpers.arrayElements(ROOM_PHOTOS, 2),
      });
    }
  }

  await prisma.pensionUniversity.createMany({ data: allPensionUnis });
  await prisma.pensionImage.createMany({ data: allImages });
  await prisma.room.createMany({ data: allRooms });

  console.log('--- Step 7: Seeding thousands of student users ---');
  const studentUsers = [];
  const TOTAL_STUDENTS = 1200;
  for (let i = 1; i <= TOTAL_STUDENTS; i++) {
    const assignedUni = universityRecords[i % universityRecords.length];
    const uniDomain = assignedUni.emailDomains[0] || 'alumnos.universidad.cl';
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const cleanEmail = slugify(`${firstName}.${lastName}.${i}`);

    const student = await prisma.user.create({
      data: {
        email: `${cleanEmail}@${uniDomain}`,
        passwordHash: defaultPasswordHash,
        firstName,
        lastName,
        phone: `+569${faker.string.numeric(8)}`,
        role: 'STUDENT' as Role,
        isEmailVerified: faker.datatype.boolean(0.85),
        universityId: assignedUni.id,
        avatarUrl: `https://images.unsplash.com/photo-${1530000000000 + (i % 30) * 35000000}?auto=format&fit=crop&w=300&q=80`,
      },
    });
    studentUsers.push(student);
  }

  console.log('--- Step 8: Seeding reviews with fixed-url image in primary cities ---');
  const allReviews = [];
  const pensionRatingsMap = new Map<string, { sum: number; count: number }>();

  for (const pension of pensionRecords) {
    const numReviews = pension.isPrimary
      ? faker.number.int({ min: 3, max: 7 })
      : faker.number.int({ min: 0, max: 2 });

    if (numReviews === 0) continue;

    const reviewingStudents = faker.helpers.arrayElements(studentUsers, numReviews);
    let sum = 0;

    for (const student of reviewingStudents) {
      const overall = faker.helpers.arrayElement([4, 5, 4, 5, 3, 5, 4]);
      sum += overall;
      const cleanliness = Math.min(
        5,
        Math.max(1, overall + faker.helpers.arrayElement([-1, 0, 1])),
      );
      const landlordRat = Math.min(
        5,
        Math.max(1, overall + faker.helpers.arrayElement([-1, 0, 1])),
      );
      const quietness = Math.min(5, Math.max(1, overall + faker.helpers.arrayElement([-1, 0, 0])));
      const wifi = Math.min(5, Math.max(1, overall + faker.helpers.arrayElement([0, 1, 0])));

      const stayDuration = faker.helpers.arrayElement([
        'ONE_SEMESTER',
        'ONE_YEAR',
        'FEW_WEEKS',
        'MORE_THAN_A_YEAR',
      ]) as StayDurationCategory;

      const hasImage = pension.isPrimary && faker.datatype.boolean(0.4);
      const images = hasImage ? [FIXED_REVIEW_IMAGE_URL] : [];

      allReviews.push({
        pensionId: pension.id,
        userId: student.id,
        overallRating: overall,
        cleanlinessRating: cleanliness,
        landlordRating: landlordRat,
        quietnessRating: quietness,
        wifiRating: wifi,
        comment: faker.helpers.arrayElement(REVIEW_COMMENTS),
        stayDurationCategory: stayDuration,
        stayStartDate: new Date('2025-03-01'),
        stayEndDate: new Date('2025-12-15'),
        exactStayDays: 289,
        isResidentVerified: student.isEmailVerified,
        images,
      });
    }

    pensionRatingsMap.set(pension.id, { sum, count: numReviews });
  }

  await prisma.review.createMany({ data: allReviews });

  for (const [pensionId, stats] of pensionRatingsMap.entries()) {
    const avg = Number((stats.sum / stats.count).toFixed(2));
    await prisma.pension.update({
      where: { id: pensionId },
      data: {
        ratingAverage: avg,
        ratingCount: stats.count,
      },
    });
  }

  console.log('--- Step 9: Seeding moderation reports strictly for primary cities ---');
  const primaryPensions = pensionRecords.filter((p) => p.isPrimary);
  const allReports = [];
  const TOTAL_REPORTS = 30;

  for (let i = 0; i < TOTAL_REPORTS; i++) {
    const reportedPension = primaryPensions[i % primaryPensions.length];
    const reportingUser = studentUsers[i % studentUsers.length];
    const reason = faker.helpers.arrayElement([
      'INACCURATE_PRICE',
      'HOUSE_RULES_VIOLATION',
      'MISLEADING_PHOTOS',
    ]) as ReportReason;

    allReports.push({
      pensionId: reportedPension.id,
      userId: reportingUser.id,
      reason,
      description:
        'La información publicada presenta discrepancias con las condiciones reales acordadas en el recinto.',
      status: 'PENDING' as ReportStatus,
    });
  }

  await prisma.report.createMany({ data: allReports });

  console.log('--- Step 10: Validating invariants & assertions ---');
  const favoritesCount = await prisma.favorite.count();
  if (favoritesCount !== 0) {
    throw new Error(`Invariant failed: expected 0 favorites, but found ${favoritesCount}`);
  }

  const reportsCount = await prisma.report.count();
  if (reportsCount !== TOTAL_REPORTS) {
    throw new Error(`Reports count mismatch: expected ${TOTAL_REPORTS}, found ${reportsCount}`);
  }

  const finalUniCount = await prisma.university.count();
  const finalPensionCount = await prisma.pension.count();
  const finalRoomCount = await prisma.room.count();
  const finalReviewCount = await prisma.review.count();

  console.log('--- Final Seed Summary ---');
  console.log(`Universities: ${finalUniCount}`);
  console.log(`Landlords: ${TOTAL_LANDLORDS}`);
  console.log(`Pensions: ${finalPensionCount}`);
  console.log(`Rooms: ${finalRoomCount}`);
  console.log(`Students: ${TOTAL_STUDENTS}`);
  console.log(`Reviews: ${finalReviewCount}`);
  console.log(`Reports: ${reportsCount}`);
  console.log(`Favorites: ${favoritesCount} (strictly empty)`);

  await prisma.$disconnect();
  await pool.end();
  console.log('--- Seed completed successfully ---');
};

main().catch(async (e) => {
  console.error('Seed execution halted with error:', e);
  process.exit(1);
});
