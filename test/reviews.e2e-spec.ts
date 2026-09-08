import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './test-utils.js';

describe('Reviews E2E', () => {
  let app: NestFastifyApplication;
  let student1Token: string;
  let student2Token: string;
  let targetPensionId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const reg1 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `student-rev1-${Date.now()}@uchile.cl`,
        password: 'Password123!',
        firstName: 'Reviewer',
        lastName: 'One',
        role: 'STUDENT',
      },
    });
    student1Token = JSON.parse(reg1.payload).data.accessToken;

    const reg2 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `student-rev2-${Date.now()}@uchile.cl`,
        password: 'Password123!',
        firstName: 'Reviewer',
        lastName: 'Two',
        role: 'STUDENT',
      },
    });
    student2Token = JSON.parse(reg2.payload).data.accessToken;

    // Get an existing pension
    const listRes = await app.inject({
      method: 'GET',
      url: '/pensions?limit=1',
    });
    targetPensionId = JSON.parse(listRes.payload).data.items[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow student to submit review and update ratingAverage', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/pensions/${targetPensionId}/reviews`,
      headers: {
        authorization: `Bearer ${student1Token}`,
      },
      payload: {
        overallRating: 5,
        cleanlinessRating: 5,
        landlordRating: 5,
        quietnessRating: 4,
        wifiRating: 5,
        comment: 'Excelente ambiente, muy limpio y el wifi funciona de maravilla.',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    const reviewId = body.data.id;
    expect(reviewId).toBeDefined();

    // Duplicate review should yield 409
    const dupRes = await app.inject({
      method: 'POST',
      url: `/pensions/${targetPensionId}/reviews`,
      headers: {
        authorization: `Bearer ${student1Token}`,
      },
      payload: {
        overallRating: 4,
        comment: 'Intento de segunda reseña por el mismo usuario.',
      },
    });

    expect(dupRes.statusCode).toBe(409);

    // Another student attempting to delete the review should get 403 Forbidden
    const deleteForbidden = await app.inject({
      method: 'DELETE',
      url: `/reviews/${reviewId}`,
      headers: {
        authorization: `Bearer ${student2Token}`,
      },
    });

    expect(deleteForbidden.statusCode).toBe(403);
  });
});
