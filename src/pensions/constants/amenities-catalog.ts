export type AmenityCategory =
  | 'BASIC_UTILITY'
  | 'ROOM_FEATURE'
  | 'COMMON_AREA'
  | 'STUDY_WORK'
  | 'SAFETY_SECURITY';

export interface AmenityCatalogItem {
  slug: string;
  name: string;
  category: AmenityCategory;
  iconKey?: string | null;
}

export const AMENITY_CATALOG_ITEMS: readonly AmenityCatalogItem[] = [
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
  {
    slug: 'gas-incluido',
    name: 'Gas incluido',
    category: 'BASIC_UTILITY',
    iconKey: 'flame',
  },
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
