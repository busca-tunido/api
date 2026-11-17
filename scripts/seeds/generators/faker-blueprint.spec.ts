import { describe, expect, it } from 'vitest';
import {
  MAX_REVIEW_IMAGES,
  type PensionMediaSource,
  selectReviewImagesForPension,
} from './faker-blueprint.js';

describe('selectReviewImagesForPension', () => {
  const samplePension: PensionMediaSource = {
    images: [
      { url: 'https://cdn.example.com/houses/high/1.webp' },
      { url: 'https://cdn.example.com/houses/high/2.webp' },
      { url: 'https://cdn.example.com/houses/high/3.webp' },
    ],
    rooms: [
      { images: ['https://cdn.example.com/rooms/high/10.webp'] },
      {
        images: [
          'https://cdn.example.com/rooms/high/11.webp',
          'https://cdn.example.com/houses/high/2.webp',
        ],
      },
    ],
  };

  const allowedUrls = new Set([
    ...samplePension.images.map((i) => i.url),
    ...samplePension.rooms.flatMap((r) => r.images),
  ]);

  it('assigns 0 images to the majority of reviews and 1 to 3 images to the rest', () => {
    let emptyCount = 0;
    let oneCount = 0;
    let twoCount = 0;
    let threeCount = 0;

    for (let i = 0; i < 100; i++) {
      const imgs = selectReviewImagesForPension(samplePension, i);
      expect(imgs.length).toBeGreaterThanOrEqual(0);
      expect(imgs.length).toBeLessThanOrEqual(MAX_REVIEW_IMAGES);
      for (const url of imgs) {
        expect(allowedUrls.has(url)).toBe(true);
      }
      if (imgs.length === 0) emptyCount++;
      else if (imgs.length === 1) oneCount++;
      else if (imgs.length === 2) twoCount++;
      else if (imgs.length === 3) threeCount++;
    }

    expect(emptyCount).toBe(70);
    expect(oneCount).toBe(15);
    expect(twoCount).toBe(10);
    expect(threeCount).toBe(5);
  });

  it('caps assigned images to available unique pension and room images', () => {
    const minimalPension: PensionMediaSource = {
      images: [{ url: 'https://cdn.example.com/houses/mid/1.webp' }],
      rooms: [{ images: ['https://cdn.example.com/houses/mid/1.webp'] }],
    };

    const imgs = selectReviewImagesForPension(minimalPension, 19);
    expect(imgs).toEqual(['https://cdn.example.com/houses/mid/1.webp']);
  });

  it('returns empty array when pension and rooms have no images', () => {
    const emptyPension: PensionMediaSource = {
      images: [],
      rooms: [{ images: [] }],
    };

    expect(selectReviewImagesForPension(emptyPension, 19)).toEqual([]);
  });
});
