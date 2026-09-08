import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './test-utils.js';

describe('Proposals & Moderation E2E', () => {
  let app: NestFastifyApplication;
  let studentToken: string;
  let moderatorToken: string;
  let targetPensionId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const studentLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'estudiante.demo@uchile.cl',
        password: 'Password123!',
      },
    });
    studentToken = JSON.parse(studentLogin.payload).data.accessToken;

    const modLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'moderador@buscatunido.cl',
        password: 'Password123!',
      },
    });
    moderatorToken = JSON.parse(modLogin.payload).data.accessToken;

    const listRes = await app.inject({
      method: 'GET',
      url: '/pensions?limit=1',
    });
    targetPensionId = JSON.parse(listRes.payload).data.items[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject unprivileged student from accessing moderation endpoints with 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/moderation/proposals',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should allow student to submit proposal and moderator to approve it', async () => {
    const submitRes = await app.inject({
      method: 'POST',
      url: `/pensions/${targetPensionId}/proposals`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        type: 'BASIC_INFO',
        proposedChanges: {
          curfewTime: '23:45',
        },
        submissionNotes: 'Ampliaron 15 minutos el horario de llegada',
      },
    });

    expect(submitRes.statusCode).toBe(201);
    const proposalId = JSON.parse(submitRes.payload).data.id;
    expect(proposalId).toBeDefined();

    // Moderator inspects diff
    const diffRes = await app.inject({
      method: 'GET',
      url: `/moderation/proposals/${proposalId}`,
      headers: {
        authorization: `Bearer ${moderatorToken}`,
      },
    });

    expect(diffRes.statusCode).toBe(200);
    const diffBody = JSON.parse(diffRes.payload).data;
    expect(diffBody.diff.curfewTime.proposed).toBe('23:45');

    // Moderator approves proposal
    const reviewRes = await app.inject({
      method: 'PATCH',
      url: `/moderation/proposals/${proposalId}/review`,
      headers: {
        authorization: `Bearer ${moderatorToken}`,
      },
      payload: {
        action: 'APPROVE',
        reviewNotes: 'Verificado y aprobado.',
      },
    });

    expect(reviewRes.statusCode).toBe(200);

    // Verify pension active listing has curfewTime updated
    const pensionRes = await app.inject({
      method: 'GET',
      url: `/pensions/${targetPensionId}`,
    });

    expect(pensionRes.statusCode).toBe(200);
    const pensionBody = JSON.parse(pensionRes.payload).data;
    expect(pensionBody.curfewTime).toBe('23:45');
  });
});
