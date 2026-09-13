import { fakerES_MX as faker } from '@faker-js/faker';
import type {
  GenderPreference,
  ProposalStatus,
  ProposalType,
  ReportReason,
  ReportStatus,
  Role,
  RoomType,
  StayDurationCategory,
  VerificationStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
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

const REVIEW_OPENERS_HIGH = [
  'Mi experiencia viviendo aquí durante mi año universitario fue excelente.',
  'Estuve alojando este semestre y la verdad superó todas mis expectativas.',
  'Un lugar muy acogedor y perfecto para enfocarse en la carrera.',
  'Bastante conforme con la estadía, cumplió con todo lo que buscaba al llegar de región.',
  'Recomiendo totalmente esta pensión para cualquier estudiante.',
  'Fue una estancia muy grata y tranquila durante todo el periodo académico.',
  'Muy buena pensión, se nota la preocupación por mantener un ambiente grato.',
  'Llegué como mechón a la ciudad y este lugar me facilitó un montón la adaptación.',
  'Excelente opción para vivir cerca de la universidad sin pagar de más.',
  'Viví aquí prácticamente todo el año y no tengo quejas.',
  'Una residencia estudiantil de primer nivel, volvería a quedarme feliz.',
  'Muy grato ambiente desde el primer día que me instalé.',
];

const REVIEW_OPENERS_MID = [
  'En general es una pensión correcta que cumple con lo básico para el año.',
  'Mi experiencia fue aceptable durante el semestre que me quedé.',
  'Buena pensión para estudiantes, aunque con algunos detalles a considerar.',
  'Cumple con lo necesario para cursar el semestre académico.',
  'Es un lugar piola para estudiar, aunque tiene cosas que podrían mejorar.',
  'La estadía estuvo bien en líneas generales, acorde al precio que se paga.',
];

const REVIEW_LOCATION = [
  'La ubicación es inmejorable, a solo unos minutos caminando de las facultades.',
  'Tiene excelente conectividad, el paradero de micros y metro quedan prácticamente a la vuelta.',
  'El barrio es muy tranquilo y seguro, incluso cuando toca volver tarde de la biblioteca.',
  'Se puede llegar a pie al campus todos los días, lo que ahorra mucho tiempo y pasajes.',
  'El sector cuenta con almacenes, farmacias y lugares accesibles para almorzar.',
  'Muy bien ubicada en una zona residencial silenciosa pero con locomoción directa.',
  'Queda cerca de centros de fotocopiado, supermercados y las principales sedes universitarias.',
  'La cercanía con el campus hace que sea muy cómodo volver en los bloques libres.',
];

const REVIEW_FACILITIES = [
  'La habitación es iluminada, con un escritorio espacioso para el computador y apuntes.',
  'La cocina compartida es amplia y cada estudiante cuenta con su espacio en el refrigerador y estantes.',
  'El agua caliente funciona perfecto y la presión de la ducha es muy buena en las mañanas.',
  'Las piezas son abrigadas y la calefacción ayuda bastante en los meses más helados.',
  'Las camas son cómodas y los clósets tienen suficiente espacio para guardar todo.',
  'Las zonas comunes se mantienen muy limpias y la lavandería funciona sin inconvenientes.',
  'El baño siempre limpio y con buena ventilación.',
  'Espacios comunes cómodos para comer y descansar entre clases.',
];

const REVIEW_WIFI_STUDY = [
  'El internet por fibra vuela, nunca tuve caídas ni lag durante certámenes online.',
  'La conexión WiFi es estable y rápida en todas las habitaciones.',
  'El ambiente para estudiar es óptimo; se respetan los horarios de silencio rigurosamente.',
  'Durante semanas de certámenes el silencio en la casa se agradece un montón.',
  'Hay buen aislamiento en las piezas, lo que permite concentrarse sin distracciones.',
  'El internet funcionó impecable para streaming, videollamadas y descargar material pesado.',
];

const REVIEW_LANDLORD_COMMUNITY = [
  'El dueño es sumamente amable y resuelve cualquier duda o inconveniente en minutos.',
  'La administración es muy cordial y respetuosa con los tiempos de los estudiantes.',
  'La convivencia con los demás compañeros fue excelente, de mucho respeto y buena onda.',
  'Se genera un ambiente muy familiar que hace sentir a uno como en casa.',
  'Muy buena disposición de los anfitriones, siempre atentos a que no falte nada.',
  'El trato siempre fue transparente y los gastos comunes claros desde el inicio.',
];

const REVIEW_NUANCES_MID = [
  'A veces en las mañanas hay que coordinar bien el uso de la ducha porque baja un poco la presión.',
  'El único punto a mejorar es que en la cocina a veces se juntan varios a la hora de almuerzo.',
  'El WiFi en las piezas del fondo a ratos baja la señal cuando todos están conectados.',
  'El refrigerador común a veces queda medio justo si todos cocinan mucho.',
  'Se escuchan un poco los ruidos de la calle los viernes, pero nada que impida descansar.',
];

const REVIEW_CONCLUSIONS_HIGH = [
  'Totalmente recomendada para quienes buscan tranquilidad y comodidad.',
  'Sin duda la mejor opción precio-calidad del sector.',
  '100% recomendada para estudiantes que vienen de otras regiones.',
  'Me voy muy contento y con excelentes recuerdos de este periodo.',
  'Si buscas un lugar ordenado para rendir bien en la U, este es.',
];

const generateRandomCredibleReview = (overallRating: number): string => {
  const parts: string[] = [];
  if (overallRating >= 4) {
    parts.push(faker.helpers.arrayElement(REVIEW_OPENERS_HIGH));
    parts.push(faker.helpers.arrayElement(REVIEW_LOCATION));
    parts.push(
      faker.helpers.arrayElement(faker.datatype.boolean() ? REVIEW_FACILITIES : REVIEW_WIFI_STUDY),
    );
    if (faker.datatype.boolean(0.6)) {
      parts.push(faker.helpers.arrayElement(REVIEW_LANDLORD_COMMUNITY));
    }
    if (faker.datatype.boolean(0.5)) {
      parts.push(faker.helpers.arrayElement(REVIEW_CONCLUSIONS_HIGH));
    }
  } else {
    parts.push(faker.helpers.arrayElement(REVIEW_OPENERS_MID));
    parts.push(
      faker.helpers.arrayElement(faker.datatype.boolean() ? REVIEW_LOCATION : REVIEW_FACILITIES),
    );
    parts.push(faker.helpers.arrayElement(REVIEW_NUANCES_MID));
    if (faker.datatype.boolean(0.6)) {
      parts.push(faker.helpers.arrayElement(REVIEW_LANDLORD_COMMUNITY));
    }
  }
  return parts.join(' ');
};

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
      "pension_proposals",
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

  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

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
  const selectedUnis = rawUniversities;
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
  const landlordDemo = await prisma.user.create({
    data: {
      email: 'propietario.demo@buscatunido.cl',
      passwordHash: defaultPasswordHash,
      firstName: 'Propietario',
      lastName: 'Demo',
      phone: '+56987654321',
      role: 'LANDLORD' as Role,
      isEmailVerified: true,
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    },
  });

  const landlordUsers = [landlordDemo];
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

    const landlord = i < 3 ? landlordDemo : landlordUsers[i % landlordUsers.length];
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
  const primaryUni =
    universityRecords.find((u) => u.name.toLowerCase().includes('chile')) || universityRecords[0];

  const studentDemo = await prisma.user.create({
    data: {
      email: 'estudiante.demo@uchile.cl',
      passwordHash: defaultPasswordHash,
      firstName: 'Estudiante',
      lastName: 'Demo',
      phone: '+56912345678',
      role: 'STUDENT' as Role,
      isEmailVerified: true,
      universityId: primaryUni.id,
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
  });

  const studentUsers = [studentDemo];
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
        comment: generateRandomCredibleReview(overall),
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

  console.log('--- Step 10: Seeding sample proposals and moderation states ---');
  const demoPension = primaryPensions[0];
  const demoStudent = studentUsers[0];
  const moderatorUser = await prisma.user.findFirst({ where: { role: 'MODERATOR' as Role } });

  await prisma.pensionProposal.createMany({
    data: [
      {
        pensionId: demoPension.id,
        submittedById: demoStudent.id,
        type: 'AMENITIES_UPDATE' as ProposalType,
        status: 'PENDING' as ProposalStatus,
        proposedChanges: {
          amenitiesToAdd: ['wifi-alta-velocidad', 'sala-estudio'],
          amenitiesToRemove: [],
        },
        submissionNotes: 'Instalaron fibra óptica y habilitaron una sala común de estudio.',
      },
      {
        pensionId: demoPension.id,
        submittedById: demoStudent.id,
        type: 'BASIC_INFO' as ProposalType,
        status: 'PENDING' as ProposalStatus,
        proposedChanges: {
          curfewTime: '00:00',
          quietHoursStart: '23:00',
        },
        submissionNotes: 'Ampliaron el horario de llegada en fines de semana.',
      },
      {
        pensionId: primaryPensions[1]?.id || demoPension.id,
        submittedById: demoStudent.id,
        reviewedById: moderatorUser?.id,
        type: 'LOCATION_UPDATE' as ProposalType,
        status: 'APPROVED' as ProposalStatus,
        proposedChanges: {
          neighborhood: 'Barrio Universitario Centro',
        },
        appliedChanges: {
          neighborhood: 'Barrio Universitario Centro',
        },
        submissionNotes: 'Ajuste de nombre del sector.',
        reviewNotes: 'Confirmado con mapa comunal.',
        reviewedAt: new Date(),
      },
    ],
  });

  const firstReview = await prisma.review.findFirst();
  if (firstReview) {
    await prisma.review.update({
      where: { id: firstReview.id },
      data: {
        isHidden: true,
        moderationReason: 'Lenguaje inapropiado detectado en el comentario.',
        moderatedById: moderatorUser?.id,
      },
    });
  }

  console.log('--- Step 11: Validating invariants & assertions ---');
  const defaultStudent = await prisma.user.findUnique({
    where: { email: 'estudiante.demo@uchile.cl' },
  });
  if (defaultStudent?.role !== 'STUDENT' || !defaultStudent.isEmailVerified) {
    throw new Error(
      'Default student assertion failed: estudiante.demo@uchile.cl missing or invalid',
    );
  }

  const defaultLandlord = await prisma.user.findUnique({
    where: { email: 'propietario.demo@buscatunido.cl' },
    include: { managedPensions: true },
  });
  if (defaultLandlord?.role !== 'LANDLORD' || defaultLandlord.managedPensions.length === 0) {
    throw new Error(
      'Default landlord assertion failed: propietario.demo@buscatunido.cl missing or has no pensions',
    );
  }

  if (
    !bcrypt.compareSync('Password123!', defaultStudent.passwordHash) ||
    !bcrypt.compareSync('Password123!', defaultLandlord.passwordHash)
  ) {
    throw new Error(
      'Password hash assertion failed: Password123! does not match seeded test accounts',
    );
  }

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
