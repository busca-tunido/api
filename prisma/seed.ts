import { fakerES_MX as faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  type AmenityCategory,
  type GenderPreference,
  PrismaClient,
  type ReportReason,
  type ReportStatus,
  type Role,
  type RoomType,
  type StayDurationCategory,
  type VerificationStatus,
} from '@prisma/client';
import { Pool } from 'pg';

type HipolabsUniversity = {
  name: string;
  domains: string[];
  web_pages: string[];
  country: string;
  'state-province': string | null;
};

type CityCoord = {
  city: string;
  latitude: number;
  longitude: number;
  neighborhoods: string[];
};

const CITY_COORDS: Record<string, CityCoord> = {
  Santiago: {
    city: 'Santiago',
    latitude: -33.4489,
    longitude: -70.6693,
    neighborhoods: [
      'Barrio Universitario',
      'República',
      'Providencia',
      'San Joaquín',
      'Santiago Centro',
      'Ñuñoa',
      'Bellavista',
      'Macul',
    ],
  },
  Valparaíso: {
    city: 'Valparaíso',
    latitude: -33.0472,
    longitude: -71.6127,
    neighborhoods: [
      'Cerro Alegre',
      'Playa Ancha',
      'El Plan',
      'Recreo',
      'Cerro Concepción',
      'Barrio Puerto',
    ],
  },
  Concepción: {
    city: 'Concepción',
    latitude: -36.8201,
    longitude: -73.0444,
    neighborhoods: [
      'Barrio Universitario',
      'Plaza Perú',
      'Centro',
      'Collao',
      'Agüita de la Perdiz',
    ],
  },
  Antofagasta: {
    city: 'Antofagasta',
    latitude: -23.6509,
    longitude: -70.3975,
    neighborhoods: ['Playa Blanca', 'Sector Sur', 'Centro', 'Gran Vía'],
  },
  Valdivia: {
    city: 'Valdivia',
    latitude: -39.8142,
    longitude: -73.2459,
    neighborhoods: ['Isla Teja', 'Centro', 'Regional', 'Collico'],
  },
  Temuco: {
    city: 'Temuco',
    latitude: -38.7359,
    longitude: -72.5904,
    neighborhoods: ['Avenida Alemania', 'Centro', 'Pueblo Nuevo', 'Barrio Inglés'],
  },
};

const FALLBACK_UNIVERSITIES: HipolabsUniversity[] = [
  {
    name: 'Universidad de Chile',
    domains: ['uchile.cl'],
    web_pages: ['https://www.uchile.cl'],
    country: 'Chile',
    'state-province': 'Santiago',
  },
  {
    name: 'Pontificia Universidad Católica de Chile',
    domains: ['uc.cl', 'puc.cl'],
    web_pages: ['https://www.uc.cl'],
    country: 'Chile',
    'state-province': 'Santiago',
  },
  {
    name: 'Universidad de Santiago de Chile',
    domains: ['usach.cl'],
    web_pages: ['https://www.usach.cl'],
    country: 'Chile',
    'state-province': 'Santiago',
  },
  {
    name: 'Universidad Técnica Federico Santa María',
    domains: ['usm.cl', 'sansano.usm.cl'],
    web_pages: ['https://www.usm.cl'],
    country: 'Chile',
    'state-province': 'Valparaíso',
  },
  {
    name: 'Universidad de Valparaíso',
    domains: ['uv.cl', 'alumnos.uv.cl'],
    web_pages: ['https://www.uv.cl'],
    country: 'Chile',
    'state-province': 'Valparaíso',
  },
  {
    name: 'Pontificia Universidad Católica de Valparaíso',
    domains: ['pucv.cl', 'mail.pucv.cl'],
    web_pages: ['https://www.pucv.cl'],
    country: 'Chile',
    'state-province': 'Valparaíso',
  },
  {
    name: 'Universidad de Concepción',
    domains: ['udec.cl'],
    web_pages: ['https://www.udec.cl'],
    country: 'Chile',
    'state-province': 'Concepción',
  },
  {
    name: 'Universidad del Bío-Bío',
    domains: ['ubiobio.cl', 'alumnos.ubiobio.cl'],
    web_pages: ['https://www.ubiobio.cl'],
    country: 'Chile',
    'state-province': 'Concepción',
  },
  {
    name: 'Universidad Austral de Chile',
    domains: ['uach.cl', 'alumnos.uach.cl'],
    web_pages: ['https://www.uach.cl'],
    country: 'Chile',
    'state-province': 'Valdivia',
  },
  {
    name: 'Universidad de La Frontera',
    domains: ['ufrontera.cl'],
    web_pages: ['https://www.ufrontera.cl'],
    country: 'Chile',
    'state-province': 'Temuco',
  },
  {
    name: 'Universidad de Antofagasta',
    domains: ['uantof.cl'],
    web_pages: ['https://www.uantof.cl'],
    country: 'Chile',
    'state-province': 'Antofagasta',
  },
  {
    name: 'Universidad Diego Portales',
    domains: ['mail.udp.cl', 'udp.cl'],
    web_pages: ['https://www.udp.cl'],
    country: 'Chile',
    'state-province': 'Santiago',
  },
  {
    name: 'Universidad Adolfo Ibáñez',
    domains: ['alumnos.uai.cl', 'uai.cl'],
    web_pages: ['https://www.uai.cl'],
    country: 'Chile',
    'state-province': 'Santiago',
  },
  {
    name: 'Universidad de los Andes',
    domains: ['miuandes.cl', 'uandes.cl'],
    web_pages: ['https://www.uandes.cl'],
    country: 'Chile',
    'state-province': 'Santiago',
  },
  {
    name: 'Universidad Central de Chile',
    domains: ['alumnos.ucentral.cl', 'ucentral.cl'],
    web_pages: ['https://www.ucentral.cl'],
    country: 'Chile',
    'state-province': 'Santiago',
  },
];

const AMENITY_DEFINITIONS: Array<{
  slug: string;
  name: string;
  category: AmenityCategory;
  iconKey: string;
}> = [
  {
    slug: 'wifi-alta-velocidad',
    name: 'Wi-Fi fibra óptica alta velocidad',
    category: 'BASIC_UTILITY',
    iconKey: 'wifi',
  },
  {
    slug: 'agua-caliente',
    name: 'Agua caliente 24/7',
    category: 'BASIC_UTILITY',
    iconKey: 'droplet',
  },
  {
    slug: 'luz-incluida',
    name: 'Electricidad incluida en renta',
    category: 'BASIC_UTILITY',
    iconKey: 'zap',
  },
  { slug: 'gas-incluido', name: 'Gas incluido', category: 'BASIC_UTILITY', iconKey: 'flame' },
  {
    slug: 'calefaccion',
    name: 'Calefacción central o estufa',
    category: 'BASIC_UTILITY',
    iconKey: 'thermometer',
  },
  {
    slug: 'bano-privado',
    name: 'Baño privado en habitación',
    category: 'ROOM_FEATURE',
    iconKey: 'bath',
  },
  {
    slug: 'escritorio-estudio',
    name: 'Escritorio y silla ergonómica',
    category: 'ROOM_FEATURE',
    iconKey: 'monitor',
  },
  {
    slug: 'closet-amplio',
    name: 'Clóset empotrado amplio',
    category: 'ROOM_FEATURE',
    iconKey: 'archive',
  },
  {
    slug: 'cama-plaza-media',
    name: 'Cama 1.5 plazas con colchón nuevo',
    category: 'ROOM_FEATURE',
    iconKey: 'bed',
  },
  {
    slug: 'ventana-exterior',
    name: 'Ventana al exterior con luz natural',
    category: 'ROOM_FEATURE',
    iconKey: 'sun',
  },
  {
    slug: 'cocina-equipada',
    name: 'Cocina compartida full equipada',
    category: 'COMMON_AREA',
    iconKey: 'utensils',
  },
  {
    slug: 'lavadora-secadora',
    name: 'Lavandería (lavadora y secadora)',
    category: 'COMMON_AREA',
    iconKey: 'disc',
  },
  {
    slug: 'living-comedor',
    name: 'Sala de estar y comedor compartido',
    category: 'COMMON_AREA',
    iconKey: 'coffee',
  },
  {
    slug: 'patio-terraza',
    name: 'Terraza / Patio al aire libre',
    category: 'COMMON_AREA',
    iconKey: 'trees',
  },
  {
    slug: 'sala-estudio-cowork',
    name: 'Sala de estudio silenciosa y coworking',
    category: 'STUDY_WORK',
    iconKey: 'book-open',
  },
  {
    slug: 'impresora-scanner',
    name: 'Punto de impresión y escáner',
    category: 'STUDY_WORK',
    iconKey: 'printer',
  },
  {
    slug: 'conserjeria-24-7',
    name: 'Conserjería / Control de acceso 24/7',
    category: 'SAFETY_SECURITY',
    iconKey: 'shield',
  },
  {
    slug: 'camaras-seguridad',
    name: 'Cámaras de vigilancia en accesos',
    category: 'SAFETY_SECURITY',
    iconKey: 'video',
  },
  {
    slug: 'cerradura-digital',
    name: 'Cerradura digital en dormitorios',
    category: 'SAFETY_SECURITY',
    iconKey: 'key',
  },
];

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

const fetchUniversities = async (): Promise<HipolabsUniversity[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch('http://universities.hipolabs.com/search?country=Chile', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return FALLBACK_UNIVERSITIES;
    }
    const data = (await response.json()) as HipolabsUniversity[];
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return FALLBACK_UNIVERSITIES;
  } catch {
    return FALLBACK_UNIVERSITIES;
  }
};

const getCityFromUniversity = (uni: HipolabsUniversity): CityCoord => {
  const nameLower = uni.name.toLowerCase();
  if (
    nameLower.includes('valparaíso') ||
    nameLower.includes('playa ancha') ||
    nameLower.includes('santa maría') ||
    nameLower.includes('viña')
  ) {
    return CITY_COORDS.Valparaíso;
  }
  if (
    nameLower.includes('concepción') ||
    nameLower.includes('bío-bío') ||
    nameLower.includes('biobío')
  ) {
    return CITY_COORDS.Concepción;
  }
  if (nameLower.includes('antofagasta') || nameLower.includes('norte')) {
    return CITY_COORDS.Antofagasta;
  }
  if (nameLower.includes('austral') || nameLower.includes('valdivia')) {
    return CITY_COORDS.Valdivia;
  }
  if (nameLower.includes('frontera') || nameLower.includes('temuco')) {
    return CITY_COORDS.Temuco;
  }
  return CITY_COORDS.Santiago;
};

const generateShortName = (name: string): string => {
  const words = name
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 2) return words.join(' ');
  const initials = words
    .filter((w) => !['de', 'del', 'la', 'los', 'las', 'y', 'el'].includes(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join('');
  return initials.slice(0, 10);
};

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const main = async (): Promise<void> => {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/buscatunido?schema=public';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

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

  const fetchedUnis = await fetchUniversities();
  const selectedUnis = fetchedUnis.slice(0, 30);

  const universityRecords = [];
  for (let index = 0; index < selectedUnis.length; index++) {
    const uni = selectedUnis[index];
    const cityInfo = getCityFromUniversity(uni);
    const jitterLat = (Math.random() - 0.5) * 0.04;
    const jitterLng = (Math.random() - 0.5) * 0.04;

    const createdUni = await prisma.university.create({
      data: {
        name: uni.name,
        shortName: generateShortName(uni.name),
        emailDomains: uni.domains.length > 0 ? uni.domains : [`uni${index + 1}.cl`],
        city: cityInfo.city,
        address: `${faker.location.street()}, ${cityInfo.city}`,
        latitude: cityInfo.latitude + jitterLat,
        longitude: cityInfo.longitude + jitterLng,
      },
    });
    universityRecords.push(createdUni);
  }

  const amenityRecords = [];
  for (const item of AMENITY_DEFINITIONS) {
    const created = await prisma.amenity.create({
      data: item,
    });
    amenityRecords.push(created);
  }

  const defaultPasswordHash = '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ekEY58Eb67980EbGO';

  const _adminUser = await prisma.user.create({
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

  const _moderatorUser = await prisma.user.create({
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

  const landlordUsers = [];
  for (let i = 1; i <= 35; i++) {
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
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + i * 50000000}?auto=format&fit=crop&w=300&q=80`,
      },
    });
    landlordUsers.push(landlord);
  }

  const studentUsers = [];
  for (let i = 1; i <= 200; i++) {
    const targetUni = universityRecords[i % universityRecords.length];
    const uniDomain = targetUni.emailDomains[0] || 'alumnos.universidad.cl';
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const cleanEmailName = slugify(`${firstName}.${lastName}.${i}`);

    const student = await prisma.user.create({
      data: {
        email: `${cleanEmailName}@${uniDomain}`,
        passwordHash: defaultPasswordHash,
        firstName,
        lastName,
        phone: `+569${faker.string.numeric(8)}`,
        role: 'STUDENT' as Role,
        isEmailVerified: faker.datatype.boolean(0.85),
        universityId: targetUni.id,
        avatarUrl: `https://images.unsplash.com/photo-${1530000000000 + (i % 20) * 40000000}?auto=format&fit=crop&w=300&q=80`,
      },
    });
    studentUsers.push(student);
  }

  const allRooms = [];
  const allImages = [];
  const allPensionUnis = [];
  const allReviews = [];
  const pensionRecords = [];

  for (let i = 0; i < 120; i++) {
    const assignedUni = universityRecords[i % universityRecords.length];
    const cityInfo = CITY_COORDS[assignedUni.city] || CITY_COORDS.Santiago;
    const neighborhood = faker.helpers.arrayElement(cityInfo.neighborhoods);
    const prefix = faker.helpers.arrayElement(PENSION_TITLES_PREFIXES);
    const street = faker.location.street();
    const title = `${prefix} ${neighborhood} ${street}`;
    const slug = `${slugify(title)}-${i + 1}`;
    const landlord = landlordUsers[i % landlordUsers.length];

    const offsetLat = (Math.random() - 0.5) * 0.02;
    const offsetLng = (Math.random() - 0.5) * 0.02;
    const pLat = assignedUni.latitude + offsetLat;
    const pLng = assignedUni.longitude + offsetLng;

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

    const numReviews = faker.number.int({ min: 2, max: 5 });
    const reviewingStudents = faker.helpers.arrayElements(studentUsers, numReviews);
    let sumOverall = 0;

    const pensionTempId = faker.string.uuid();

    for (const student of reviewingStudents) {
      const overall = faker.helpers.arrayElement([4, 5, 4, 5, 3, 5, 4]);
      sumOverall += overall;
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

      allReviews.push({
        pensionId: pensionTempId,
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
        images: faker.datatype.boolean(0.3) ? [faker.helpers.arrayElement(ROOM_PHOTOS)] : [],
      });
    }

    const calculatedAvg = Number((sumOverall / numReviews).toFixed(2));

    const createdPension = await prisma.pension.create({
      data: {
        id: pensionTempId,
        slug,
        title,
        description: `Excelente pensión para estudiantes ubicada en ${neighborhood}, a corta distancia de ${assignedUni.name}. Cuenta con grato ambiente de estudio, cocina completamente equipada, dormitorios iluminados y servicios básicos incluidos en la renta. Barrio seguro y con conectividad inmediata a locomoción colectiva.`,
        address: `${street} ${faker.number.int({ min: 100, max: 2800 })}`,
        city: assignedUni.city,
        neighborhood,
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
        ratingAverage: calculatedAvg,
        ratingCount: numReviews,
        isActive: true,
        landlordId: landlord.id,
        submittedById: landlord.id,
        amenities: {
          connect: selectedAmenities.map((a) => ({ id: a.id })),
        },
      },
    });

    pensionRecords.push(createdPension);

    const distMeters = faker.number.int({ min: 250, max: 2200 });
    const walkMin = Math.round(distMeters / 80);
    const transMin = Math.round(distMeters / 250) + 4;

    allPensionUnis.push({
      pensionId: createdPension.id,
      universityId: assignedUni.id,
      distanceMeters: distMeters,
      walkingMinutes: walkMin,
      transitMinutes: transMin,
    });

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
      const roomPriceModifier = roomType === 'SHARED' ? -30000 : roomType === 'STUDIO' ? 50000 : 0;
      const roomPrice = Math.max(150000, basePrice + roomPriceModifier);

      allRooms.push({
        pensionId: createdPension.id,
        roomNumber: `Hab ${r * 10 + r}`,
        title: `Habitación ${roomType === 'SINGLE' ? 'Individual' : roomType === 'SHARED' ? 'Compartida' : 'Estudio'} #${r}`,
        description: `Habitación amoblada con cama, escritorio y clóset. ${hasPrivateBath ? 'Incluye baño privado.' : 'Baño compartido.'}`,
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
  await prisma.review.createMany({ data: allReviews });

  const allReports = [];
  for (let i = 0; i < 30; i++) {
    const reportedPension = pensionRecords[i % pensionRecords.length];
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
        'La información publicada presenta discrepancias con las condiciones reales acordadas.',
      status: 'PENDING' as ReportStatus,
    });
  }
  await prisma.report.createMany({ data: allReports });

  const allFavorites = [];
  for (let sIdx = 0; sIdx < 80; sIdx++) {
    const student = studentUsers[sIdx];
    const favPensions = faker.helpers.arrayElements(pensionRecords, { min: 2, max: 5 });
    for (const p of favPensions) {
      allFavorites.push({
        userId: student.id,
        pensionId: p.id,
      });
    }
  }
  await prisma.favorite.createMany({ data: allFavorites, skipDuplicates: true });

  await prisma.$disconnect();
  await pool.end();
};

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
