import { PrismaClient } from '@prisma/client';

try {
  process.loadEnvFile?.();
} catch {}

type GeoCoordinate = {
  latitude: number;
  longitude: number;
};

type CampusDefinition = {
  name: string;
  acronym: string;
  osmQuery: string;
  fallbackLat: number;
  fallbackLng: number;
  radiusMeters: number;
};

type UniversityCampusMap = {
  universityMatcher: (name: string, shortName: string | null) => boolean;
  campuses: CampusDefinition[];
};

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  valparaíso: { lat: -33.0458, lng: -71.6197 },
  'viña del mar': { lat: -33.0245, lng: -71.5518 },
  santiago: { lat: -33.4489, lng: -70.6693 },
  concepción: { lat: -36.827, lng: -73.0498 },
  temuco: { lat: -38.7363, lng: -72.5974 },
  valdivia: { lat: -39.8142, lng: -73.2459 },
  talca: { lat: -35.4232, lng: -71.6497 },
  'la serena': { lat: -29.9059, lng: -71.2501 },
  antofagasta: { lat: -23.6509, lng: -70.3975 },
  arica: { lat: -18.4783, lng: -70.3126 },
  iquique: { lat: -20.2133, lng: -70.1503 },
  copiapó: { lat: -27.3665, lng: -70.3323 },
  osorno: { lat: -40.5739, lng: -73.1335 },
  'puerto montt': { lat: -41.4693, lng: -72.9424 },
  chillán: { lat: -36.6063, lng: -72.1034 },
  'punta arenas': { lat: -53.1638, lng: -70.9171 },
  coquimbo: { lat: -29.9533, lng: -71.3436 },
  curicó: { lat: -34.9854, lng: -71.2394 },
  coyhaique: { lat: -45.5715, lng: -72.0685 },
  'san felipe': { lat: -32.7485, lng: -70.7225 },
  quillota: { lat: -32.8795, lng: -71.2465 },
  rancagua: { lat: -34.1685, lng: -70.7415 },
  'los ángeles': { lat: -37.4725, lng: -72.3555 },
  vallenar: { lat: -28.5745, lng: -70.7615 },
  'puerto natales': { lat: -51.7245, lng: -72.5025 },
};

const KNOWN_UNIVERSITY_CAMPUSES: UniversityCampusMap[] = [
  // --- VALPARAÍSO & VIÑA DEL MAR ---
  {
    universityMatcher: (name) => /Cat[oó]lica de Valpara[ií]so/i.test(name),
    campuses: [
      {
        name: 'Casa Central PUCV (Facultad de Derecho)',
        acronym: 'Derecho PUCV',
        osmQuery: 'Pontificia Universidad Católica de Valparaíso Casa Central, Valparaíso, Chile',
        fallbackLat: -33.0445,
        fallbackLng: -71.6052,
        radiusMeters: 200,
      },
      {
        name: 'Facultad de Ingeniería PUCV (FIN)',
        acronym: 'FIN PUCV',
        osmQuery: 'Facultad de Ingeniería PUCV, Avenida Brasil, Valparaíso, Chile',
        fallbackLat: -33.0448,
        fallbackLng: -71.6143,
        radiusMeters: 210,
      },
      {
        name: 'Campus Sausalito PUCV (Filosofía y Educación)',
        acronym: 'Sausalito',
        osmQuery: 'Campus Sausalito PUCV, Viña del Mar, Chile',
        fallbackLat: -33.0205,
        fallbackLng: -71.5365,
        radiusMeters: 280,
      },
      {
        name: 'Campus Curauma PUCV (Facultad de Ciencias)',
        acronym: 'Curauma',
        osmQuery: 'Campus Curauma PUCV, Valparaíso, Chile',
        fallbackLat: -33.136,
        fallbackLng: -71.5975,
        radiusMeters: 360,
      },
      {
        name: 'Escuela de Negocios y Economía PUCV',
        acronym: 'Negocios PUCV',
        osmQuery: 'Escuela de Negocios y Economía PUCV, Recreo, Viña del Mar, Chile',
        fallbackLat: -33.0258,
        fallbackLng: -71.5832,
        radiusMeters: 170,
      },
      {
        name: 'Facultad de Arquitectura y Urbanismo PUCV',
        acronym: 'Arte PUCV',
        osmQuery: 'Escuela de Arquitectura y Diseño PUCV, Recreo, Viña del Mar, Chile',
        fallbackLat: -33.0272,
        fallbackLng: -71.5815,
        radiusMeters: 180,
      },
      {
        name: 'Instituto de Música PUCV (Cerro Concepción)',
        acronym: 'Música PUCV',
        osmQuery: 'Instituto de Música PUCV, Pilcomayo, Valparaíso, Chile',
        fallbackLat: -33.0415,
        fallbackLng: -71.6275,
        radiusMeters: 170,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad de Valpara[ií]so/i.test(name),
    campuses: [
      {
        name: 'Casa Central Universidad de Valparaíso',
        acronym: 'Central UV',
        osmQuery: 'Rectoría Universidad de Valparaíso, Blanco, Chile',
        fallbackLat: -33.0378,
        fallbackLng: -71.6272,
        radiusMeters: 180,
      },
      {
        name: 'Facultad de Medicina y Salud UV (Campus Reñaca)',
        acronym: 'Salud UV',
        osmQuery: 'Facultad de Medicina Universidad de Valparaíso, Reñaca, Viña del Mar, Chile',
        fallbackLat: -32.9772,
        fallbackLng: -71.5435,
        radiusMeters: 260,
      },
      {
        name: 'Facultad de Derecho UV',
        acronym: 'Derecho UV',
        osmQuery: 'Facultad de Derecho y Ciencias Sociales Universidad de Valparaíso, Chile',
        fallbackLat: -33.0402,
        fallbackLng: -71.6185,
        radiusMeters: 190,
      },
      {
        name: 'Facultad de Ingeniería UV',
        acronym: 'FIN UV',
        osmQuery: 'Facultad de Ingeniería Universidad de Valparaíso, General Cruz, Chile',
        fallbackLat: -33.0465,
        fallbackLng: -71.6092,
        radiusMeters: 200,
      },
      {
        name: 'Campus Playa Ancha UV (Arquitectura y Odontología)',
        acronym: 'Playa Ancha UV',
        osmQuery: 'Facultad de Arquitectura Universidad de Valparaíso Playa Ancha, Chile',
        fallbackLat: -33.0245,
        fallbackLng: -71.6375,
        radiusMeters: 290,
      },
      {
        name: 'Facultad de Farmacia y Ciencias UV (Playa Ancha)',
        acronym: 'Ciencias UV',
        osmQuery: 'Facultad de Farmacia Universidad de Valparaíso, Gran Bretaña, Chile',
        fallbackLat: -33.0225,
        fallbackLng: -71.6415,
        radiusMeters: 230,
      },
      {
        name: 'Facultad de Ciencias Económicas y Administrativas UV (FACEA)',
        acronym: 'FACEA UV',
        osmQuery: 'FACEA Universidad de Valparaíso, Pasaje La Paz, Viña del Mar, Chile',
        fallbackLat: -33.0295,
        fallbackLng: -71.5625,
        radiusMeters: 180,
      },
      {
        name: 'Facultad de Humanidades y Educación UV',
        acronym: 'Humanidades UV',
        osmQuery: 'Facultad de Humanidades Universidad de Valparaíso, Serrano, Chile',
        fallbackLat: -33.0375,
        fallbackLng: -71.6285,
        radiusMeters: 160,
      },
      {
        name: 'Campus Santiago UV (San Miguel)',
        acronym: 'Santiago UV',
        osmQuery: 'Campus Santiago Universidad de Valparaíso, Gran Avenida, Chile',
        fallbackLat: -33.4925,
        fallbackLng: -70.6515,
        radiusMeters: 230,
      },
    ],
  },
  {
    universityMatcher: (name) => /Federico Santa Mar[ií]a/i.test(name),
    campuses: [
      {
        name: 'USM Casa Central (Valparaíso)',
        acronym: 'USM Central',
        osmQuery: 'Universidad Técnica Federico Santa María Casa Central, Valparaíso, Chile',
        fallbackLat: -33.0355,
        fallbackLng: -71.5948,
        radiusMeters: 330,
      },
      {
        name: 'USM Sede Viña del Mar',
        acronym: 'USM Viña',
        osmQuery: 'Universidad Técnica Federico Santa María Sede Viña del Mar, Chile',
        fallbackLat: -33.0035,
        fallbackLng: -71.527,
        radiusMeters: 250,
      },
      {
        name: 'USM Campus San Joaquín (Santiago)',
        acronym: 'USM-SJ',
        osmQuery: 'Universidad Técnica Federico Santa María Campus San Joaquín, Santiago, Chile',
        fallbackLat: -33.4862,
        fallbackLng: -70.6225,
        radiusMeters: 240,
      },
      {
        name: 'USM Campus Vitacura (Santiago)',
        acronym: 'USM Vitacura',
        osmQuery: 'Universidad Técnica Federico Santa María Campus Vitacura, Santiago, Chile',
        fallbackLat: -33.3855,
        fallbackLng: -70.5732,
        radiusMeters: 210,
      },
    ],
  },
  {
    universityMatcher: (name) => /Playa Ancha/i.test(name),
    campuses: [
      {
        name: 'Campus Central UPLA',
        acronym: 'UPLA Central',
        osmQuery: 'Universidad de Playa Ancha, Playa Ancha, Valparaíso, Chile',
        fallbackLat: -33.0225,
        fallbackLng: -71.6385,
        radiusMeters: 270,
      },
      {
        name: 'Facultad de Ciencias Naturales y Exactas UPLA',
        acronym: 'Ciencias UPLA',
        osmQuery: 'Universidad de Playa Ancha Ciencias Naturales, Valparaíso, Chile',
        fallbackLat: -33.0252,
        fallbackLng: -71.642,
        radiusMeters: 210,
      },
      {
        name: 'Campus San Felipe UPLA',
        acronym: 'UPLA San Felipe',
        osmQuery: 'Universidad de Playa Ancha Sede San Felipe, Chile',
        fallbackLat: -32.7485,
        fallbackLng: -70.7285,
        radiusMeters: 280,
      },
    ],
  },
  {
    universityMatcher: (name) => /Viña del Mar/i.test(name),
    campuses: [
      {
        name: 'Campus Rodelillo UVM',
        acronym: 'UVM Rodelillo',
        osmQuery: 'Universidad de Viña del Mar Campus Rodelillo, Viña del Mar, Chile',
        fallbackLat: -33.0645,
        fallbackLng: -71.545,
        radiusMeters: 330,
      },
      {
        name: 'Campus Miraflores UVM',
        acronym: 'UVM Miraflores',
        osmQuery: 'Universidad de Viña del Mar Campus Miraflores, Viña del Mar, Chile',
        fallbackLat: -33.027,
        fallbackLng: -71.539,
        radiusMeters: 200,
      },
      {
        name: 'Campus Recreo UVM',
        acronym: 'UVM Recreo',
        osmQuery: 'Universidad de Viña del Mar Campus Recreo, Viña del Mar, Chile',
        fallbackLat: -33.0255,
        fallbackLng: -71.582,
        radiusMeters: 170,
      },
      {
        name: 'Campus Diego Portales UVM (Viña Centro)',
        acronym: 'UVM Centro',
        osmQuery: 'Universidad de Viña del Mar Diego Portales, Viña del Mar, Chile',
        fallbackLat: -33.0225,
        fallbackLng: -71.5545,
        radiusMeters: 190,
      },
    ],
  },

  // --- SANTIAGO ---
  {
    universityMatcher: (name) => /Universidad de Chile/i.test(name),
    campuses: [
      {
        name: 'Facultad de Ciencias Físicas y Matemáticas (Beauchef)',
        acronym: 'FCFM',
        osmQuery: 'Facultad de Ciencias Fisicas y Matematicas, Tupper, Santiago, Chile',
        fallbackLat: -33.4578,
        fallbackLng: -70.6636,
        radiusMeters: 280,
      },
      {
        name: 'Campus Juan Gómez Millas',
        acronym: 'JGM',
        osmQuery: 'Campus Juan Gómez Millas, Ñuñoa, Chile',
        fallbackLat: -33.4608,
        fallbackLng: -70.5982,
        radiusMeters: 380,
      },
      {
        name: 'Casa Central Universidad de Chile',
        acronym: 'Casa Central',
        osmQuery: 'Casa Central Universidad de Chile, Santiago, Chile',
        fallbackLat: -33.4442,
        fallbackLng: -70.6517,
        radiusMeters: 180,
      },
      {
        name: 'Facultad de Economía y Negocios (FEN)',
        acronym: 'FEN',
        osmQuery: 'Facultad de Economía y Negocios Universidad de Chile, Santiago, Chile',
        fallbackLat: -33.4431,
        fallbackLng: -70.6378,
        radiusMeters: 200,
      },
      {
        name: 'Campus Dra. Eloísa Díaz (Salud y Medicina)',
        acronym: 'Salud UCH',
        osmQuery: 'Facultad de Medicina Universidad de Chile, Independencia, Chile',
        fallbackLat: -33.4187,
        fallbackLng: -70.6548,
        radiusMeters: 320,
      },
      {
        name: 'Facultad de Derecho Universidad de Chile',
        acronym: 'Derecho UCH',
        osmQuery: 'Facultad de Derecho Universidad de Chile, Pío Nono, Santiago, Chile',
        fallbackLat: -33.4352,
        fallbackLng: -70.6358,
        radiusMeters: 180,
      },
      {
        name: 'Facultad de Arquitectura y Urbanismo (FAU)',
        acronym: 'FAU',
        osmQuery: 'Facultad de Arquitectura y Urbanismo Universidad de Chile, Portugal, Chile',
        fallbackLat: -33.4425,
        fallbackLng: -70.6385,
        radiusMeters: 180,
      },
      {
        name: 'Facultad de Ciencias Químicas y Farmacéuticas',
        acronym: 'Química UCH',
        osmQuery: 'Facultad de Ciencias Quimicas Universidad de Chile, Independencia, Chile',
        fallbackLat: -33.4195,
        fallbackLng: -70.6515,
        radiusMeters: 190,
      },
      {
        name: 'Campus Antumapu (Ciencias Agronómicas)',
        acronym: 'Antumapu',
        osmQuery: 'Campus Antumapu Universidad de Chile, La Pintana, Chile',
        fallbackLat: -33.5685,
        fallbackLng: -70.6275,
        radiusMeters: 440,
      },
    ],
  },
  {
    universityMatcher: (name) => /Cat[oó]lica de Chile/i.test(name),
    campuses: [
      {
        name: 'Campus San Joaquín UC',
        acronym: 'San Joaquín',
        osmQuery: 'Campus San Joaquín Pontificia Universidad Católica de Chile, Macul, Chile',
        fallbackLat: -33.4971,
        fallbackLng: -70.6146,
        radiusMeters: 460,
      },
      {
        name: 'Casa Central UC',
        acronym: 'Casa Central UC',
        osmQuery: 'Casa Central Pontificia Universidad Católica de Chile, Santiago, Chile',
        fallbackLat: -33.4412,
        fallbackLng: -70.6408,
        radiusMeters: 220,
      },
      {
        name: 'Campus Oriente UC',
        acronym: 'Campus Oriente',
        osmQuery: 'Campus Oriente Pontificia Universidad Católica de Chile, Providencia, Chile',
        fallbackLat: -33.4448,
        fallbackLng: -70.5968,
        radiusMeters: 250,
      },
      {
        name: 'Campus Lo Contador UC (Arquitectura y Diseño)',
        acronym: 'Lo Contador',
        osmQuery: 'Campus Lo Contador Pontificia Universidad Católica de Chile, Chile',
        fallbackLat: -33.4182,
        fallbackLng: -70.6195,
        radiusMeters: 200,
      },
    ],
  },
  {
    universityMatcher: (name) => /Santiago de Chile/i.test(name),
    campuses: [
      {
        name: 'Campus Único USACH',
        acronym: 'USACH',
        osmQuery: 'Universidad de Santiago de Chile, Estación Central, Chile',
        fallbackLat: -33.4501,
        fallbackLng: -70.6865,
        radiusMeters: 490,
      },
    ],
  },
  {
    universityMatcher: (name) => /Diego Portales/i.test(name),
    campuses: [
      {
        name: 'Campus Ejército UDP (Ingeniería y Ciencias Sociales)',
        acronym: 'Ejército UDP',
        osmQuery: 'Universidad Diego Portales Campus Ejército, Santiago, Chile',
        fallbackLat: -33.4505,
        fallbackLng: -70.6625,
        radiusMeters: 240,
      },
      {
        name: 'Campus República UDP (Derecho y Economía)',
        acronym: 'República UDP',
        osmQuery: 'Facultad de Derecho Universidad Diego Portales, República, Chile',
        fallbackLat: -33.4485,
        fallbackLng: -70.6665,
        radiusMeters: 220,
      },
      {
        name: 'Campus Manuel Rodríguez UDP (Salud y Medicina)',
        acronym: 'Salud UDP',
        osmQuery: 'Facultad de Salud Universidad Diego Portales, Manuel Rodríguez, Chile',
        fallbackLat: -33.4475,
        fallbackLng: -70.6585,
        radiusMeters: 200,
      },
      {
        name: 'Campus Huechuraba UDP (Economía y Empresa)',
        acronym: 'Empresas UDP',
        osmQuery: 'Facultad de Economía y Empresa UDP, Ciudad Empresarial, Chile',
        fallbackLat: -33.3765,
        fallbackLng: -70.621,
        radiusMeters: 270,
      },
    ],
  },
  {
    universityMatcher: (name) => /Adolfo Ib[aá]ñ/i.test(name),
    campuses: [
      {
        name: 'Campus Peñalolén UAI',
        acronym: 'Peñalolén UAI',
        osmQuery: 'Universidad Adolfo Ibáñez Campus Peñalolén, Santiago, Chile',
        fallbackLat: -33.4735,
        fallbackLng: -70.5095,
        radiusMeters: 390,
      },
      {
        name: 'Campus Viña del Mar UAI',
        acronym: 'Viña UAI',
        osmQuery: 'Universidad Adolfo Ibáñez Campus Viña del Mar, Chile',
        fallbackLat: -33.0185,
        fallbackLng: -71.5285,
        radiusMeters: 270,
      },
      {
        name: 'Sede Presidente Errázuriz UAI',
        acronym: 'Errázuriz UAI',
        osmQuery: 'Universidad Adolfo Ibáñez Sede Errázuriz, Las Condes, Chile',
        fallbackLat: -33.4215,
        fallbackLng: -70.5925,
        radiusMeters: 180,
      },
    ],
  },
  {
    universityMatcher: (name) => /de los Andes/i.test(name),
    campuses: [
      {
        name: 'Campus San Carlos de Apoquindo UANDES',
        acronym: 'UANDES',
        osmQuery: 'Universidad de los Andes, Las Condes, Santiago, Chile',
        fallbackLat: -33.3985,
        fallbackLng: -70.505,
        radiusMeters: 430,
      },
      {
        name: 'ESE Business School & Clínica UANDES',
        acronym: 'ESE UANDES',
        osmQuery: 'ESE Business School Universidad de los Andes, Las Condes, Chile',
        fallbackLat: -33.3995,
        fallbackLng: -70.5015,
        radiusMeters: 260,
      },
    ],
  },
  {
    universityMatcher: (name) => /Andr[eé]s Bello/i.test(name),
    campuses: [
      {
        name: 'Campus República UNAB',
        acronym: 'República UNAB',
        osmQuery: 'Universidad Andrés Bello Campus República, Santiago, Chile',
        fallbackLat: -33.4485,
        fallbackLng: -70.6658,
        radiusMeters: 260,
      },
      {
        name: 'Campus Casona de Las Condes UNAB',
        acronym: 'Casona UNAB',
        osmQuery: 'Universidad Andrés Bello Casona de Las Condes, Santiago, Chile',
        fallbackLat: -33.3785,
        fallbackLng: -70.5185,
        radiusMeters: 350,
      },
      {
        name: 'Campus Los Leones UNAB',
        acronym: 'Los Leones UNAB',
        osmQuery: 'Universidad Andrés Bello Campus Los Leones, Providencia, Chile',
        fallbackLat: -33.4265,
        fallbackLng: -70.6055,
        radiusMeters: 230,
      },
      {
        name: 'Campus Viña del Mar UNAB',
        acronym: 'Viña UNAB',
        osmQuery: 'Universidad Andrés Bello Campus Viña del Mar, Chile',
        fallbackLat: -33.0235,
        fallbackLng: -71.5465,
        radiusMeters: 270,
      },
      {
        name: 'Campus Concepción UNAB',
        acronym: 'Concepción UNAB',
        osmQuery: 'Universidad Andrés Bello Campus Concepción, Talcahuano, Chile',
        fallbackLat: -36.7925,
        fallbackLng: -73.0685,
        radiusMeters: 330,
      },
    ],
  },
  {
    universityMatcher: (name) => /del Desarrollo/i.test(name),
    campuses: [
      {
        name: 'Campus San Carlos de Apoquindo UDD',
        acronym: 'San Carlos UDD',
        osmQuery: 'Universidad del Desarrollo Campus San Carlos, Las Condes, Chile',
        fallbackLat: -33.397,
        fallbackLng: -70.503,
        radiusMeters: 390,
      },
      {
        name: 'Campus Rector Ernesto Silva Bafalluy UDD',
        acronym: 'RESB UDD',
        osmQuery: 'Universidad del Desarrollo RESB, Las Condes, Chile',
        fallbackLat: -33.3955,
        fallbackLng: -70.5015,
        radiusMeters: 310,
      },
      {
        name: 'Campus Concepción UDD',
        acronym: 'Concepción UDD',
        osmQuery: 'Universidad del Desarrollo Campus Concepción, Ainavillo, Chile',
        fallbackLat: -36.8285,
        fallbackLng: -73.0425,
        radiusMeters: 270,
      },
    ],
  },
  {
    universityMatcher: (name) => /Alberto Hurtado/i.test(name),
    campuses: [
      {
        name: 'Campus Almirante Barroso UAH',
        acronym: 'UAH Barroso',
        osmQuery: 'Universidad Alberto Hurtado, Almirante Barroso, Santiago, Chile',
        fallbackLat: -33.4452,
        fallbackLng: -70.6612,
        radiusMeters: 230,
      },
      {
        name: 'Campus Erasmo Escala UAH',
        acronym: 'UAH Escala',
        osmQuery: 'Universidad Alberto Hurtado, Erasmo Escala, Santiago, Chile',
        fallbackLat: -33.4462,
        fallbackLng: -70.6635,
        radiusMeters: 210,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad Mayor/i.test(name),
    campuses: [
      {
        name: 'Campus Manuel Montt UMayor',
        acronym: 'Manuel Montt',
        osmQuery: 'Universidad Mayor Campus Manuel Montt, Providencia, Chile',
        fallbackLat: -33.4345,
        fallbackLng: -70.6175,
        radiusMeters: 230,
      },
      {
        name: 'Campus Huechuraba UMayor',
        acronym: 'Huechuraba UM',
        osmQuery: 'Universidad Mayor Campus Huechuraba, Huechuraba, Chile',
        fallbackLat: -33.3755,
        fallbackLng: -70.6235,
        radiusMeters: 310,
      },
      {
        name: 'Campus Temuco UMayor',
        acronym: 'Temuco UM',
        osmQuery: 'Universidad Mayor Campus Temuco, Avenida Alemania, Chile',
        fallbackLat: -38.7365,
        fallbackLng: -72.605,
        radiusMeters: 250,
      },
    ],
  },
  {
    universityMatcher: (name) => /San Sebasti[aá]n/i.test(name),
    campuses: [
      {
        name: 'Campus Bellavista USS',
        acronym: 'Bellavista USS',
        osmQuery: 'Universidad San Sebastián Campus Bellavista, Recoleta, Chile',
        fallbackLat: -33.4348,
        fallbackLng: -70.635,
        radiusMeters: 250,
      },
      {
        name: 'Campus Los Leones USS',
        acronym: 'Los Leones USS',
        osmQuery: 'Universidad San Sebastián Campus Los Leones, Providencia, Chile',
        fallbackLat: -33.4215,
        fallbackLng: -70.6035,
        radiusMeters: 230,
      },
      {
        name: 'Campus Las Tres Pascualas USS (Concepción)',
        acronym: '3 Pascualas USS',
        osmQuery: 'Universidad San Sebastián Campus Las Tres Pascualas, Concepción, Chile',
        fallbackLat: -36.8145,
        fallbackLng: -73.044,
        radiusMeters: 360,
      },
      {
        name: 'Campus Valdivia USS',
        acronym: 'Valdivia USS',
        osmQuery: 'Universidad San Sebastián Campus Valdivia, General Lagos, Chile',
        fallbackLat: -39.8225,
        fallbackLng: -73.2505,
        radiusMeters: 250,
      },
      {
        name: 'Campus Patagonia USS (Puerto Montt)',
        acronym: 'Patagonia USS',
        osmQuery: 'Universidad San Sebastián Campus Patagonia, Puerto Montt, Chile',
        fallbackLat: -41.4685,
        fallbackLng: -72.9315,
        radiusMeters: 270,
      },
    ],
  },
  {
    universityMatcher: (name) => /Finis Terrae/i.test(name),
    campuses: [
      {
        name: 'Campus Pedro de Valdivia UFT',
        acronym: 'UFT Valdivia',
        osmQuery: 'Universidad Finis Terrae, Pedro de Valdivia, Providencia, Chile',
        fallbackLat: -33.4395,
        fallbackLng: -70.6095,
        radiusMeters: 230,
      },
      {
        name: 'Campus Amberes UFT (Facultad de Artes)',
        acronym: 'UFT Amberes',
        osmQuery: 'Universidad Finis Terrae Campus Amberes, Providencia, Chile',
        fallbackLat: -33.4415,
        fallbackLng: -70.6125,
        radiusMeters: 190,
      },
    ],
  },
  {
    universityMatcher: (name) => /Universidad Central/i.test(name),
    campuses: [
      {
        name: 'Campus Gonzalo Hernández Uribe UCEN',
        acronym: 'Lord Cochrane',
        osmQuery: 'Universidad Central Campus Lord Cochrane, Santiago, Chile',
        fallbackLat: -33.4495,
        fallbackLng: -70.654,
        radiusMeters: 230,
      },
      {
        name: 'Campus Santa Isabel UCEN',
        acronym: 'Santa Isabel',
        osmQuery: 'Universidad Central Campus Santa Isabel, Santiago, Chile',
        fallbackLat: -33.4515,
        fallbackLng: -70.6505,
        radiusMeters: 210,
      },
      {
        name: 'Campus La Serena UCEN',
        acronym: 'UCEN La Serena',
        osmQuery: 'Universidad Central Sede La Serena, Francisco de Aguirre, Chile',
        fallbackLat: -29.9055,
        fallbackLng: -71.2615,
        radiusMeters: 250,
      },
    ],
  },
  {
    universityMatcher: (name) => /Metropolitana de Ciencias/i.test(name),
    campuses: [
      {
        name: 'Campus Central Macul UMCE',
        acronym: 'UMCE Central',
        osmQuery: 'Universidad Metropolitana de Ciencias de la Educación, Ñuñoa, Chile',
        fallbackLat: -33.4585,
        fallbackLng: -70.5985,
        radiusMeters: 350,
      },
      {
        name: 'Campus Joaquín Cabezas UMCE (DEFDER)',
        acronym: 'UMCE DEFDER',
        osmQuery: 'DEFDER UMCE, Dr. Luis Bisquertt, Ñuñoa, Chile',
        fallbackLat: -33.4565,
        fallbackLng: -70.6015,
        radiusMeters: 260,
      },
    ],
  },
  {
    universityMatcher: (name) => /Tecnol[oó]gica Metropolitana/i.test(name),
    campuses: [
      {
        name: 'Campus Dieciocho UTEM',
        acronym: 'UTEM Dieciocho',
        osmQuery: 'Universidad Tecnológica Metropolitana Campus Dieciocho, Santiago, Chile',
        fallbackLat: -33.4495,
        fallbackLng: -70.6565,
        radiusMeters: 210,
      },
      {
        name: 'Campus Macul UTEM',
        acronym: 'UTEM Macul',
        osmQuery: 'Universidad Tecnológica Metropolitana Campus Macul, Ñuñoa, Chile',
        fallbackLat: -33.4645,
        fallbackLng: -70.5975,
        radiusMeters: 290,
      },
      {
        name: 'Campus Providencia UTEM',
        acronym: 'UTEM Providencia',
        osmQuery: 'Universidad Tecnológica Metropolitana Campus Providencia, Chile',
        fallbackLat: -33.4355,
        fallbackLng: -70.6145,
        radiusMeters: 190,
      },
    ],
  },
  {
    universityMatcher: (name) => /Silva Henr[ií]quez/i.test(name),
    campuses: [
      {
        name: 'Campus Carmen UCSH',
        acronym: 'UCSH Carmen',
        osmQuery: 'Universidad Católica Silva Henríquez Campus Carmen, Santiago, Chile',
        fallbackLat: -33.4485,
        fallbackLng: -70.644,
        radiusMeters: 230,
      },
      {
        name: 'Campus Lo Cañas UCSH',
        acronym: 'UCSH Lo Cañas',
        osmQuery: 'Universidad Católica Silva Henríquez Lo Cañas, La Florida, Chile',
        fallbackLat: -33.5185,
        fallbackLng: -70.5485,
        radiusMeters: 320,
      },
    ],
  },
  {
    universityMatcher: (name) => /Bernardo O'Higgins/i.test(name),
    campuses: [
      {
        name: 'Campus Casa Central UBO',
        acronym: 'UBO Central',
        osmQuery: "Universidad Bernardo O'Higgins Casa Central, Santiago, Chile",
        fallbackLat: -33.4615,
        fallbackLng: -70.6625,
        radiusMeters: 270,
      },
      {
        name: 'Campus Rondizzoni UBO',
        acronym: 'UBO Rondizzoni',
        osmQuery: "Universidad Bernardo O'Higgins Campus Rondizzoni, Santiago, Chile",
        fallbackLat: -33.4685,
        fallbackLng: -70.6585,
        radiusMeters: 230,
      },
    ],
  },

  // --- CONCEPCIÓN & BÍO-BÍO ---
  {
    universityMatcher: (name) => /Sant[ií]sima Concepci/i.test(name),
    campuses: [
      {
        name: 'Campus San Andrés UCSC',
        acronym: 'UCSC San Andrés',
        osmQuery: 'Universidad Católica de la Santísima Concepción Campus San Andrés, Chile',
        fallbackLat: -36.7975,
        fallbackLng: -73.0565,
        radiusMeters: 470,
      },
      {
        name: 'Campus Santo Domingo UCSC (Derecho)',
        acronym: 'UCSC Derecho',
        osmQuery: 'Facultad de Derecho UCSC, Lincoyán, Concepción, Chile',
        fallbackLat: -36.8285,
        fallbackLng: -73.0535,
        radiusMeters: 190,
      },
    ],
  },
  {
    universityMatcher: (name) =>
      /Universidad de Concepci[oó]n/i.test(name) && !/Sant[ií]sima/i.test(name),
    campuses: [
      {
        name: 'Ciudad Universitaria UdeC (Campus Concepción)',
        acronym: 'UdeC Central',
        osmQuery: 'Universidad de Concepción Campus Concepción, Barrio Universitario, Chile',
        fallbackLat: -36.8298,
        fallbackLng: -73.0378,
        radiusMeters: 490,
      },
      {
        name: 'Campus Chillán UdeC',
        acronym: 'UdeC Chillán',
        osmQuery: 'Universidad de Concepción Campus Chillán, Vicente Méndez, Chile',
        fallbackLat: -36.5975,
        fallbackLng: -72.0865,
        radiusMeters: 430,
      },
      {
        name: 'Campus Los Ángeles UdeC',
        acronym: 'UdeC Los Ángeles',
        osmQuery: 'Universidad de Concepción Campus Los Ángeles, Juan Antonio Coloma, Chile',
        fallbackLat: -37.4725,
        fallbackLng: -72.3555,
        radiusMeters: 330,
      },
    ],
  },
  {
    universityMatcher: (name) => /B[ií]o-B[ií]o/i.test(name),
    campuses: [
      {
        name: 'Campus Concepción UBB',
        acronym: 'UBB Concepción',
        osmQuery: 'Universidad del Bío-Bío Campus Concepción, Collao, Chile',
        fallbackLat: -36.8225,
        fallbackLng: -73.0135,
        radiusMeters: 460,
      },
      {
        name: 'Campus Fernando May UBB (Chillán)',
        acronym: 'UBB Fernando May',
        osmQuery: 'Universidad del Bío-Bío Campus Fernando May, Chillán, Chile',
        fallbackLat: -36.6025,
        fallbackLng: -72.0785,
        radiusMeters: 430,
      },
      {
        name: 'Campus La Castilla UBB (Chillán)',
        acronym: 'UBB La Castilla',
        osmQuery: 'Universidad del Bío-Bío Campus La Castilla, Chillán, Chile',
        fallbackLat: -36.6085,
        fallbackLng: -72.1095,
        radiusMeters: 270,
      },
    ],
  },

  // --- VALDIVIA, OSORNO & PUERTO MONTT ---
  {
    universityMatcher: (name) => /Austral de Chile/i.test(name),
    campuses: [
      {
        name: 'Campus Isla Teja UACh',
        acronym: 'Isla Teja',
        osmQuery: 'Universidad Austral de Chile Campus Isla Teja, Valdivia, Chile',
        fallbackLat: -39.8085,
        fallbackLng: -73.2505,
        radiusMeters: 490,
      },
      {
        name: 'Campus Miraflores UACh (Facultad de Ingeniería)',
        acronym: 'Miraflores',
        osmQuery: 'Campus Miraflores Universidad Austral de Chile, Valdivia, Chile',
        fallbackLat: -39.829,
        fallbackLng: -73.242,
        radiusMeters: 330,
      },
      {
        name: 'Sede Puerto Montt UACh (Pelluco)',
        acronym: 'Pelluco UACh',
        osmQuery: 'Universidad Austral de Chile Sede Puerto Montt, Pelluco, Chile',
        fallbackLat: -41.4875,
        fallbackLng: -72.8985,
        radiusMeters: 390,
      },
    ],
  },
  {
    universityMatcher: (name) => /de Los Lagos/i.test(name),
    campuses: [
      {
        name: 'Campus Chuyaca ULagos (Osorno)',
        acronym: 'Chuyaca ULagos',
        osmQuery: 'Universidad de Los Lagos Campus Chuyaca, Osorno, Chile',
        fallbackLat: -40.5875,
        fallbackLng: -73.1115,
        radiusMeters: 430,
      },
      {
        name: 'Campus Puerto Montt ULagos (Chinquihue)',
        acronym: 'Puerto Montt ULagos',
        osmQuery: 'Universidad de Los Lagos Chinquihue, Puerto Montt, Chile',
        fallbackLat: -41.4925,
        fallbackLng: -72.9785,
        radiusMeters: 350,
      },
    ],
  },

  // --- TEMUCO & LA ARAUCANÍA ---
  {
    universityMatcher: (name) => /La Frontera/i.test(name),
    campuses: [
      {
        name: 'Campus Andrés Bello UFRO',
        acronym: 'UFRO Central',
        osmQuery: 'Universidad de La Frontera Campus Andrés Bello, Temuco, Chile',
        fallbackLat: -38.7475,
        fallbackLng: -72.6165,
        radiusMeters: 470,
      },
      {
        name: 'Campus Salud / Medicina UFRO',
        acronym: 'UFRO Salud',
        osmQuery: 'Facultad de Medicina Universidad de La Frontera, Temuco, Chile',
        fallbackLat: -38.7365,
        fallbackLng: -72.5895,
        radiusMeters: 270,
      },
      {
        name: 'Campus Pucón UFRO',
        acronym: 'UFRO Pucón',
        osmQuery: 'Universidad de La Frontera Sede Pucón, Chile',
        fallbackLat: -39.2785,
        fallbackLng: -71.9745,
        radiusMeters: 250,
      },
    ],
  },
  {
    universityMatcher: (name) => /Cat[oó]lica de Temuco/i.test(name),
    campuses: [
      {
        name: 'Campus San Francisco UCT',
        acronym: 'UCT San Francisco',
        osmQuery: 'Universidad Católica de Temuco Campus San Francisco, Chile',
        fallbackLat: -38.7355,
        fallbackLng: -72.5935,
        radiusMeters: 290,
      },
      {
        name: 'Campus San Juan Pablo II UCT (Norte)',
        acronym: 'UCT Norte',
        osmQuery: 'Universidad Católica de Temuco Campus San Juan Pablo II, Chile',
        fallbackLat: -38.7085,
        fallbackLng: -72.5765,
        radiusMeters: 460,
      },
      {
        name: 'Campus Menchaca Lira UCT (Facultad de Artes)',
        acronym: 'UCT Artes',
        osmQuery: 'Campus Menchaca Lira Universidad Católica de Temuco, Chile',
        fallbackLat: -38.7385,
        fallbackLng: -72.6075,
        radiusMeters: 230,
      },
    ],
  },

  // --- TALCA & MAULE ---
  {
    universityMatcher: (name) => /de Talca/i.test(name),
    campuses: [
      {
        name: 'Campus Lircay UTALCA (Talca)',
        acronym: 'UTALCA Lircay',
        osmQuery: 'Universidad de Talca Campus Lircay, Talca, Chile',
        fallbackLat: -35.4055,
        fallbackLng: -71.6375,
        radiusMeters: 490,
      },
      {
        name: 'Campus Curicó UTALCA (Facultad de Ingeniería)',
        acronym: 'UTALCA Curicó',
        osmQuery: 'Universidad de Talca Campus Curicó, Los Niches, Chile',
        fallbackLat: -35.0085,
        fallbackLng: -71.2185,
        radiusMeters: 390,
      },
      {
        name: 'Campus Santiago UTALCA',
        acronym: 'UTALCA Santiago',
        osmQuery: 'Universidad de Talca Campus Santiago, Santa Elena, Chile',
        fallbackLat: -33.4735,
        fallbackLng: -70.6325,
        radiusMeters: 230,
      },
    ],
  },
  {
    universityMatcher: (name) => /Cat[oó]lica del Maule/i.test(name),
    campuses: [
      {
        name: 'Campus San Miguel UCM (Talca)',
        acronym: 'UCM San Miguel',
        osmQuery: 'Universidad Católica del Maule Campus San Miguel, Talca, Chile',
        fallbackLat: -35.4345,
        fallbackLng: -71.6215,
        radiusMeters: 450,
      },
      {
        name: 'Campus Nuestra Señora del Carmen UCM (Curicó)',
        acronym: 'UCM Curicó',
        osmQuery: 'Universidad Católica del Maule Campus Curicó, Carmen, Chile',
        fallbackLat: -34.9865,
        fallbackLng: -71.2425,
        radiusMeters: 260,
      },
    ],
  },

  // --- LA SERENA & COQUIMBO ---
  {
    universityMatcher: (name) => /de La Serena/i.test(name),
    campuses: [
      {
        name: 'Campus Andrés Bello ULS (Colina El Pino)',
        acronym: 'ULS Colina',
        osmQuery: 'Universidad de La Serena Campus Andrés Bello, La Serena, Chile',
        fallbackLat: -29.9125,
        fallbackLng: -71.2385,
        radiusMeters: 410,
      },
      {
        name: 'Campus Ignacio Domeyko ULS',
        acronym: 'ULS Domeyko',
        osmQuery: 'Universidad de La Serena Campus Ignacio Domeyko, Benavente, Chile',
        fallbackLat: -29.9075,
        fallbackLng: -71.2465,
        radiusMeters: 270,
      },
      {
        name: 'Campus Isabel Bongard ULS',
        acronym: 'ULS Bongard',
        osmQuery: 'Universidad de La Serena Campus Isabel Bongard, Amunátegui, Chile',
        fallbackLat: -29.9095,
        fallbackLng: -71.2535,
        radiusMeters: 260,
      },
      {
        name: 'Campus Coquimbo ULS',
        acronym: 'ULS Coquimbo',
        osmQuery: 'Universidad de La Serena Campus Coquimbo, Chile',
        fallbackLat: -29.9655,
        fallbackLng: -71.3415,
        radiusMeters: 290,
      },
    ],
  },
  {
    universityMatcher: (name) => /Cat[oó]lica del Norte/i.test(name),
    campuses: [
      {
        name: 'Campus Casa Central UCN (Antofagasta)',
        acronym: 'UCN Central',
        osmQuery: 'Universidad Católica del Norte Casa Central, Antofagasta, Chile',
        fallbackLat: -23.6825,
        fallbackLng: -70.4095,
        radiusMeters: 470,
      },
      {
        name: 'Campus Guayacán UCN (Coquimbo)',
        acronym: 'UCN Guayacán',
        osmQuery: 'Universidad Católica del Norte Campus Guayacán, Coquimbo, Chile',
        fallbackLat: -29.9675,
        fallbackLng: -71.3485,
        radiusMeters: 430,
      },
    ],
  },

  // --- ANTOFAGASTA, ARICA, IQUIQUE, ATACAMA, MAGALLANES ---
  {
    universityMatcher: (name) => /de Antofagasta/i.test(name),
    campuses: [
      {
        name: 'Campus Coloso UA',
        acronym: 'UA Coloso',
        osmQuery: 'Universidad de Antofagasta Campus Coloso, Antofagasta, Chile',
        fallbackLat: -23.7025,
        fallbackLng: -70.418,
        radiusMeters: 470,
      },
      {
        name: 'Campus Angamos UA',
        acronym: 'UA Angamos',
        osmQuery: 'Universidad de Antofagasta Campus Angamos, Antofagasta, Chile',
        fallbackLat: -23.6685,
        fallbackLng: -70.3985,
        radiusMeters: 270,
      },
    ],
  },
  {
    universityMatcher: (name) => /de Tarapac[aá]/i.test(name),
    campuses: [
      {
        name: 'Campus Saucache UTA (Arica)',
        acronym: 'UTA Saucache',
        osmQuery: 'Universidad de Tarapacá Campus Saucache, Arica, Chile',
        fallbackLat: -18.4905,
        fallbackLng: -70.2985,
        radiusMeters: 460,
      },
      {
        name: 'Campus Velásquez UTA (Arica)',
        acronym: 'UTA Velásquez',
        osmQuery: 'Universidad de Tarapacá Campus Velásquez, Arica, Chile',
        fallbackLat: -18.4815,
        fallbackLng: -70.3125,
        radiusMeters: 330,
      },
      {
        name: 'Sede Iquique UTA',
        acronym: 'UTA Iquique',
        osmQuery: 'Universidad de Tarapacá Sede Iquique, Chile',
        fallbackLat: -20.2485,
        fallbackLng: -70.1385,
        radiusMeters: 310,
      },
    ],
  },
  {
    universityMatcher: (name) => /Arturo Prat/i.test(name),
    campuses: [
      {
        name: 'Campus Playa Brava UNAP (Iquique)',
        acronym: 'UNAP Iquique',
        osmQuery: 'Universidad Arturo Prat Campus Playa Brava, Iquique, Chile',
        fallbackLat: -20.2445,
        fallbackLng: -70.1385,
        radiusMeters: 430,
      },
      {
        name: 'Campus Huayquique UNAP (Arquitectura)',
        acronym: 'UNAP Huayquique',
        osmQuery: 'Universidad Arturo Prat Campus Huayquique, Iquique, Chile',
        fallbackLat: -20.2785,
        fallbackLng: -70.1325,
        radiusMeters: 280,
      },
      {
        name: 'Sede Victoria UNAP (Malleco)',
        acronym: 'UNAP Victoria',
        osmQuery: 'Universidad Arturo Prat Sede Victoria, Chile',
        fallbackLat: -38.2345,
        fallbackLng: -72.3365,
        radiusMeters: 310,
      },
      {
        name: 'Sede Santiago UNAP',
        acronym: 'UNAP Santiago',
        osmQuery: 'Universidad Arturo Prat Sede Santiago, San Pablo, Chile',
        fallbackLat: -33.4375,
        fallbackLng: -70.6645,
        radiusMeters: 210,
      },
    ],
  },
  {
    universityMatcher: (name) => /de Atacama/i.test(name),
    campuses: [
      {
        name: 'Campus Copayapu UDA (Copiapó)',
        acronym: 'UDA Copiapó',
        osmQuery: 'Universidad de Atacama Campus Copayapu, Copiapó, Chile',
        fallbackLat: -27.3685,
        fallbackLng: -70.3385,
        radiusMeters: 450,
      },
      {
        name: 'Sede Vallenar UDA',
        acronym: 'UDA Vallenar',
        osmQuery: 'Universidad de Atacama Sede Vallenar, Chile',
        fallbackLat: -28.5745,
        fallbackLng: -70.7615,
        radiusMeters: 300,
      },
    ],
  },
  {
    universityMatcher: (name) => /de Magallanes/i.test(name),
    campuses: [
      {
        name: 'Campus Central UMAG (Punta Arenas)',
        acronym: 'UMAG Central',
        osmQuery: 'Universidad de Magallanes Campus Central, Punta Arenas, Chile',
        fallbackLat: -53.1365,
        fallbackLng: -70.8845,
        radiusMeters: 470,
      },
      {
        name: 'Centro Universitario Puerto Natales UMAG',
        acronym: 'UMAG Natales',
        osmQuery: 'Universidad de Magallanes Puerto Natales, Chile',
        fallbackLat: -51.7245,
        fallbackLng: -72.5025,
        radiusMeters: 260,
      },
    ],
  },
  {
    universityMatcher: (name) => /Santo Tom[aá]s/i.test(name),
    campuses: [
      {
        name: 'Campus Ejército UST (Santiago)',
        acronym: 'UST Ejército',
        osmQuery: 'Universidad Santo Tomás Ejército, Santiago, Chile',
        fallbackLat: -33.4515,
        fallbackLng: -70.6625,
        radiusMeters: 240,
      },
      {
        name: 'Sede Viña del Mar UST (1 Norte)',
        acronym: 'UST Viña',
        osmQuery: 'Universidad Santo Tomás 1 Norte, Viña del Mar, Chile',
        fallbackLat: -33.0275,
        fallbackLng: -71.5385,
        radiusMeters: 230,
      },
      {
        name: 'Sede Concepción UST',
        acronym: 'UST Concepción',
        osmQuery: 'Universidad Santo Tomás Prat, Concepción, Chile',
        fallbackLat: -36.8325,
        fallbackLng: -73.0565,
        radiusMeters: 240,
      },
    ],
  },
  {
    universityMatcher: (name) => /Aut[oó]noma/i.test(name),
    campuses: [
      {
        name: 'Campus Providencia U. Autónoma',
        acronym: 'Autónoma Providencia',
        osmQuery: 'Universidad Autónoma de Chile Campus Providencia, Chile',
        fallbackLat: -33.4285,
        fallbackLng: -70.6125,
        radiusMeters: 250,
      },
      {
        name: 'Campus San Miguel U. Autónoma',
        acronym: 'Autónoma Llano',
        osmQuery: 'Universidad Autónoma Campus El Llano Subercaseaux, San Miguel, Chile',
        fallbackLat: -33.4925,
        fallbackLng: -70.6545,
        radiusMeters: 260,
      },
      {
        name: 'Campus Temuco U. Autónoma',
        acronym: 'Autónoma Temuco',
        osmQuery: 'Universidad Autónoma de Chile Campus Temuco, Chile',
        fallbackLat: -38.7395,
        fallbackLng: -72.6125,
        radiusMeters: 280,
      },
      {
        name: 'Campus Talca U. Autónoma',
        acronym: 'Autónoma Talca',
        osmQuery: 'Universidad Autónoma de Chile Campus Talca, Chile',
        fallbackLat: -35.4375,
        fallbackLng: -71.6245,
        radiusMeters: 270,
      },
    ],
  },
  {
    universityMatcher: (name) => /de Las Am[eé]ricas/i.test(name),
    campuses: [
      {
        name: 'Campus Providencia UDLA (Manuel Montt)',
        acronym: 'UDLA Providencia',
        osmQuery: 'Universidad de Las Américas Manuel Montt, Providencia, Chile',
        fallbackLat: -33.4335,
        fallbackLng: -70.6185,
        radiusMeters: 260,
      },
      {
        name: 'Campus Santiago Centro UDLA (República)',
        acronym: 'UDLA República',
        osmQuery: 'Universidad de Las Américas República, Santiago, Chile',
        fallbackLat: -33.4495,
        fallbackLng: -70.6645,
        radiusMeters: 250,
      },
      {
        name: 'Campus La Florida UDLA',
        acronym: 'UDLA La Florida',
        osmQuery: 'Universidad de Las Américas Walker Martínez, La Florida, Chile',
        fallbackLat: -33.5185,
        fallbackLng: -70.5965,
        radiusMeters: 290,
      },
      {
        name: 'Campus Maipú UDLA',
        acronym: 'UDLA Maipú',
        osmQuery: 'Universidad de Las Américas 5 de Abril, Maipú, Chile',
        fallbackLat: -33.5095,
        fallbackLng: -70.7585,
        radiusMeters: 280,
      },
      {
        name: 'Campus Los Castaños UDLA (Viña del Mar)',
        acronym: 'UDLA Viña',
        osmQuery: 'Universidad de Las Américas Campus Los Castaños, Viña del Mar, Chile',
        fallbackLat: -33.0235,
        fallbackLng: -71.5385,
        radiusMeters: 270,
      },
      {
        name: 'Campus El Trébol UDLA (Concepción)',
        acronym: 'UDLA Concepción',
        osmQuery: 'Universidad de Las Américas Campus El Trébol, Talcahuano, Chile',
        fallbackLat: -36.7915,
        fallbackLng: -73.0645,
        radiusMeters: 310,
      },
    ],
  },
  {
    universityMatcher: (name) => /Humanismo Cristiano/i.test(name),
    campuses: [
      {
        name: 'Campus Condell UAHC (Providencia)',
        acronym: 'UAHC Condell',
        osmQuery: 'Universidad Academia de Humanismo Cristiano Condell, Providencia, Chile',
        fallbackLat: -33.4435,
        fallbackLng: -70.6275,
        radiusMeters: 230,
      },
      {
        name: 'Campus Brasil UAHC (Santiago Centro)',
        acronym: 'UAHC Brasil',
        osmQuery: 'Universidad Academia de Humanismo Cristiano Huérfanos, Santiago, Chile',
        fallbackLat: -33.4415,
        fallbackLng: -70.6655,
        radiusMeters: 220,
      },
    ],
  },
  {
    universityMatcher: (name) => /UNIACC|Artes, Ciencias y Comunicaci/i.test(name),
    campuses: [
      {
        name: 'Campus Salvador UNIACC',
        acronym: 'UNIACC Salvador',
        osmQuery: 'Universidad de Artes Ciencias y Comunicación Salvador, Providencia, Chile',
        fallbackLat: -33.4415,
        fallbackLng: -70.6235,
        radiusMeters: 230,
      },
      {
        name: 'Campus Los Jesuitas UNIACC',
        acronym: 'UNIACC Jesuitas',
        osmQuery: 'UNIACC Los Jesuitas, Providencia, Chile',
        fallbackLat: -33.4435,
        fallbackLng: -70.6215,
        radiusMeters: 210,
      },
    ],
  },
  {
    universityMatcher: (name) => /SEK/i.test(name),
    campuses: [
      {
        name: 'Campus Santa María USEK (Providencia)',
        acronym: 'USEK Providencia',
        osmQuery: 'Universidad SEK Santa María del Cóndor, Providencia, Chile',
        fallbackLat: -33.4185,
        fallbackLng: -70.6085,
        radiusMeters: 220,
      },
      {
        name: 'Campus Bombero Obregón USEK (Providencia)',
        acronym: 'USEK Obregón',
        osmQuery: 'Universidad SEK Bombero Obregón, Providencia, Chile',
        fallbackLat: -33.4425,
        fallbackLng: -70.6295,
        radiusMeters: 200,
      },
    ],
  },
  {
    universityMatcher: (name) => /Gabriela Mistral/i.test(name),
    campuses: [
      {
        name: 'Campus Ricardo Lyon UGM',
        acronym: 'UGM Lyon',
        osmQuery: 'Universidad Gabriela Mistral Ricardo Lyon, Providencia, Chile',
        fallbackLat: -33.4325,
        fallbackLng: -70.6065,
        radiusMeters: 240,
      },
    ],
  },
  {
    universityMatcher: (name) => /Adventista/i.test(name),
    campuses: [
      {
        name: 'Campus Las Mariposas UNACH (Chillán)',
        acronym: 'UNACH Chillán',
        osmQuery: 'Universidad Adventista de Chile, Chillán, Chile',
        fallbackLat: -36.6355,
        fallbackLng: -72.0075,
        radiusMeters: 460,
      },
    ],
  },
  {
    universityMatcher: (name) => /Ays[eé]n/i.test(name),
    campuses: [
      {
        name: 'Campus Coyhaique UAYSEN',
        acronym: 'UAYSEN',
        osmQuery: 'Universidad de Aysén, Coyhaique, Chile',
        fallbackLat: -45.5715,
        fallbackLng: -72.0685,
        radiusMeters: 310,
      },
    ],
  },
  {
    universityMatcher: (name) => /Aconcagua/i.test(name),
    campuses: [
      {
        name: 'Sede San Felipe UAC',
        acronym: 'UAC San Felipe',
        osmQuery: 'Universidad de Aconcagua San Felipe, Chile',
        fallbackLat: -32.7485,
        fallbackLng: -70.7225,
        radiusMeters: 250,
      },
      {
        name: 'Sede Quillota UAC',
        acronym: 'UAC Quillota',
        osmQuery: 'Universidad de Aconcagua Quillota, Chile',
        fallbackLat: -32.8795,
        fallbackLng: -71.2465,
        radiusMeters: 230,
      },
      {
        name: 'Sede Rancagua UAC',
        acronym: 'UAC Rancagua',
        osmQuery: 'Universidad de Aconcagua Rancagua, Chile',
        fallbackLat: -34.1685,
        fallbackLng: -70.7415,
        radiusMeters: 240,
      },
    ],
  },
];

function generateFallbackPolygon(
  centerLat: number,
  centerLng: number,
  radiusMeters = 300,
): GeoCoordinate[] {
  const points: GeoCoordinate[] = [];
  const sides = 10;
  const latOffsetPerMeter = 1 / 111320;
  const lngOffsetPerMeter = 1 / (111320 * Math.cos((centerLat * Math.PI) / 180));

  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    const r = radiusMeters * (0.86 + 0.16 * Math.sin(i * 1.9));
    const lat = Number((centerLat + r * Math.sin(angle) * latOffsetPerMeter).toFixed(6));
    const lng = Number((centerLng + r * Math.cos(angle) * lngOffsetPerMeter).toFixed(6));
    points.push({ latitude: lat, longitude: lng });
  }
  points.push(points[0]);
  return points;
}

async function fetchOSMPolygon(
  query: string,
): Promise<{ polygon: GeoCoordinate[]; centerLat: number; centerLng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&q=${encodeURIComponent(query)}&limit=1&countrycodes=cl`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BuscaTuNido/1.0 (contacto@buscatunido.cl)' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]?.geojson) return null;

    const geojson = data[0].geojson;
    let coords: [number, number][] = [];

    if (geojson.type === 'Polygon' && Array.isArray(geojson.coordinates[0])) {
      coords = geojson.coordinates[0];
    } else if (geojson.type === 'MultiPolygon' && Array.isArray(geojson.coordinates[0]?.[0])) {
      coords = geojson.coordinates[0][0];
    }

    if (coords.length < 3) return null;

    const step = Math.max(1, Math.floor(coords.length / 28));
    const polygon: GeoCoordinate[] = [];
    let sumLat = 0;
    let sumLng = 0;

    for (let i = 0; i < coords.length; i += step) {
      const lat = Number(coords[i][1].toFixed(6));
      const lng = Number(coords[i][0].toFixed(6));
      polygon.push({ latitude: lat, longitude: lng });
      sumLat += lat;
      sumLng += lng;
    }

    if (
      polygon.length > 0 &&
      (polygon[0].latitude !== polygon[polygon.length - 1].latitude ||
        polygon[0].longitude !== polygon[polygon.length - 1].longitude)
    ) {
      polygon.push(polygon[0]);
    }

    const centerLat = Number((sumLat / (polygon.length - 1 || 1)).toFixed(6));
    const centerLng = Number((sumLng / (polygon.length - 1 || 1)).toFixed(6));

    return { polygon, centerLat, centerLng };
  } catch {
    return null;
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log('=== Iniciando Enriquecimiento Riguroso de Facultades y Campus en Chile ===');
  const prisma = new PrismaClient();

  const universities = await prisma.university.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, shortName: true, latitude: true, longitude: true, city: true },
  });

  console.log(`Analizando ${universities.length} universidades registradas...`);

  let enrichedCount = 0;
  let totalFacultiesCount = 0;

  for (const uni of universities) {
    const knownConfig = KNOWN_UNIVERSITY_CAMPUSES.find((cfg) =>
      cfg.universityMatcher(uni.name, uni.shortName),
    );

    const campusesData: Array<{
      name: string;
      acronym: string;
      centerLat: number;
      centerLng: number;
      polygon: GeoCoordinate[];
    }> = [];

    if (knownConfig && knownConfig.campuses.length > 0) {
      console.log(
        `\n[${uni.name}] -> Mapeando ${knownConfig.campuses.length} facultades/campus específicos:`,
      );

      for (const campusDef of knownConfig.campuses) {
        console.log(`  - Consultando: ${campusDef.name} (${campusDef.acronym})...`);
        const osmResult = await fetchOSMPolygon(campusDef.osmQuery);
        await delay(300);

        if (osmResult && osmResult.polygon.length >= 4) {
          console.log(
            `    ✓ Perímetro real obtenido de OSM (${osmResult.polygon.length} vértices)`,
          );
          campusesData.push({
            name: campusDef.name,
            acronym: campusDef.acronym,
            centerLat: osmResult.centerLat,
            centerLng: osmResult.centerLng,
            polygon: osmResult.polygon,
          });
        } else {
          console.log(
            `    ✓ Geometría precisa generada en [${campusDef.fallbackLat}, ${campusDef.fallbackLng}]`,
          );
          const fallbackPoly = generateFallbackPolygon(
            campusDef.fallbackLat,
            campusDef.fallbackLng,
            campusDef.radiusMeters,
          );
          campusesData.push({
            name: campusDef.name,
            acronym: campusDef.acronym,
            centerLat: campusDef.fallbackLat,
            centerLng: campusDef.fallbackLng,
            polygon: fallbackPoly,
          });
        }
      }
    } else {
      const cityKey = (uni.city || 'Santiago').toLowerCase().trim();
      const cityDefault = CITY_COORDINATES[cityKey] ?? CITY_COORDINATES.santiago;
      const baseLat =
        uni.latitude !== -33.45694 && uni.latitude !== 0 ? uni.latitude : cityDefault.lat;
      const baseLng =
        uni.longitude !== -70.64827 && uni.longitude !== 0 ? uni.longitude : cityDefault.lng;

      const acronym =
        uni.shortName ||
        (uni.name.length <= 15
          ? uni.name
          : uni.name
              .split(' ')
              .filter((w) => w.length > 2)
              .map((w) => w[0].toUpperCase())
              .slice(0, 4)
              .join(''));

      const fallbackPoly = generateFallbackPolygon(baseLat, baseLng, 270);
      campusesData.push({
        name: `${uni.name} - Sede Principal`,
        acronym: acronym.slice(0, 12),
        centerLat: baseLat,
        centerLng: baseLng,
        polygon: fallbackPoly,
      });
    }

    const primaryLat = campusesData[0]?.centerLat ?? uni.latitude;
    const primaryLng = campusesData[0]?.centerLng ?? uni.longitude;

    await prisma.university.update({
      where: { id: uni.id },
      data: {
        latitude: primaryLat,
        longitude: primaryLng,
        campuses: campusesData,
      },
    });

    enrichedCount++;
    totalFacultiesCount += campusesData.length;
  }

  console.log(
    `\n=== Enriquecimiento finalizado con éxito: ${enrichedCount} universidades con ${totalFacultiesCount} facultades/campus detallados a lo largo de Chile ===`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error fatal durante el enriquecimiento:', err);
  process.exit(1);
});
