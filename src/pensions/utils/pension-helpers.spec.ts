import { describe, expect, it } from 'vitest';
import type { PensionDocRaw } from '../types/pension-raw.types.js';
import {
  formatPensionItem,
  mapImagesInput,
  resolvePensionThumbnailUrl,
} from './pension-helpers.js';

describe('pension-helpers image thumbnail resolution', () => {
  const uploadedUuid = '123e4567-e89b-12d3-a456-426614174000';
  const uploadedUrl = `https://cdn.example.com/uploads/v1/production/pensions/${uploadedUuid}.webp`;
  const expectedThumbUrl = `https://cdn.example.com/uploads/v1/production/pensions/${uploadedUuid}-thumb.webp`;

  it('derives -thumb.webp for uploaded S3 UUID webp URLs when thumbnailUrl is missing or equal to url', () => {
    expect(resolvePensionThumbnailUrl(uploadedUrl)).toBe(expectedThumbUrl);
    expect(resolvePensionThumbnailUrl(uploadedUrl, uploadedUrl)).toBe(expectedThumbUrl);
    expect(resolvePensionThumbnailUrl(uploadedUrl, '')).toBe(expectedThumbUrl);
  });

  it('preserves explicit custom thumbnailUrl and keeps external URLs intact', () => {
    expect(
      resolvePensionThumbnailUrl(uploadedUrl, 'https://cdn.example.com/custom-thumb.webp'),
    ).toBe('https://cdn.example.com/custom-thumb.webp');
    const externalUrl = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5';
    expect(resolvePensionThumbnailUrl(externalUrl)).toBe(externalUrl);
    expect(resolvePensionThumbnailUrl(externalUrl, externalUrl)).toBe(externalUrl);
  });

  it('populates derived thumbnailUrl in mapImagesInput', () => {
    const externalUrl = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5';
    const mapped = mapImagesInput([uploadedUrl, externalUrl]);

    expect(mapped[0]?.thumbnailUrl).toBe(expectedThumbUrl);
    expect(mapped[1]?.thumbnailUrl).toBe(externalUrl);
  });

  it('backfills derived thumbnailUrl in formatPensionItem for legacy records', () => {
    const mockPension = {
      id: 'pension-1',
      slug: 'pension-1',
      title: 'Test Pension',
      description: 'Desc',
      address: 'Calle 1',
      neighborhood: 'Centro',
      city: 'Santiago',
      latitude: -33.45,
      longitude: -70.66,
      baseMonthlyPrice: 250000,
      currency: 'CLP',
      waterIncluded: true,
      electricityIncluded: true,
      gasIncluded: true,
      internetIncluded: true,
      guestsAllowed: false,
      smokingAllowed: false,
      petsAllowed: false,
      genderPreference: 'ANY',
      verificationStatus: 'OFFICIALLY_VERIFIED',
      isActive: true,
      ratingAverage: 4.5,
      ratingCount: 3,
      images: [
        {
          id: 'img-1',
          url: uploadedUrl,
          thumbnailUrl: uploadedUrl,
          sortOrder: 0,
        },
      ],
      amenities: [],
      nearbyUniversities: [],
      rooms: [],
    } as unknown as PensionDocRaw;

    const formatted = formatPensionItem(mockPension, 3, 'card') as {
      images: Array<{ url: string; thumbnailUrl: string }>;
    };

    expect(formatted.images[0]?.url).toBe(uploadedUrl);
    expect(formatted.images[0]?.thumbnailUrl).toBe(expectedThumbUrl);
  });
});
