const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const NON_ALNUM_REGEX = /[^a-z0-9]+/g;
const EDGE_DASHES_REGEX = /^-+|-+$/g;

export const isValidObjectId = (value: unknown): value is string =>
  typeof value === 'string' && value.length === 24 && OBJECT_ID_REGEX.test(value);

export const stripDiacritics = (value: string): string =>
  value.normalize('NFD').replace(DIACRITICS_REGEX, '');

export const normalizeCityKey = (city: string): string =>
  stripDiacritics(city.trim().toLowerCase());

export const slugify = (text: string): string =>
  stripDiacritics(text.toLowerCase()).replace(NON_ALNUM_REGEX, '-').replace(EDGE_DASHES_REGEX, '');

export const formatSlugAsTitle = (slug: string): string =>
  slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
