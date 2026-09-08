import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './test-utils.js';

describe('Auth E2E', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject unauthenticated access to /auth/me with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('should reject registration with invalid password length with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `short-pass-${Date.now()}@uchile.cl`,
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should reject public registration with MODERATOR role with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `mod-attempt-${Date.now()}@uchile.cl`,
        password: 'ValidPassword123!',
        firstName: 'Mod',
        lastName: 'Hacker',
        role: 'MODERATOR',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should register a valid student user with 201', async () => {
    const email = `student-${Date.now()}@uchile.cl`;
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: 'ValidPassword123!',
        firstName: 'Estudiante',
        lastName: 'Nuevo',
        role: 'STUDENT',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.user.email).toBe(email);

    // Duplicate email check
    const dupRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: 'ValidPassword123!',
        firstName: 'Estudiante',
        lastName: 'Duplicado',
      },
    });

    expect(dupRes.statusCode).toBe(409);
  });

  it('should login with valid credentials and return accessToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'estudiante.demo@uchile.cl',
        password: 'Password123!',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.accessToken).toBeDefined();
  });

  it('should reject login with wrong password with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'estudiante.demo@uchile.cl',
        password: 'WrongPassword999!',
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
