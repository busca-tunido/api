import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './test-utils.js';

describe('Pensions E2E', () => {
  let app: NestFastifyApplication;
  let landlordToken: string;
  let studentToken: string;
  let otherLandlordToken: string;

  beforeAll(async () => {
    app = await createTestApp();

    const landlordLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'propietario.demo@buscatunido.cl',
        password: 'Password123!',
      },
    });
    console.log('LANDLORD LOGIN RESPONSE:', landlordLogin.statusCode, landlordLogin.payload);
    landlordToken = JSON.parse(landlordLogin.payload).data?.accessToken;

    const studentLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'estudiante.demo@uchile.cl',
        password: 'Password123!',
      },
    });
    studentToken = JSON.parse(studentLogin.payload).data.accessToken;

    // Register a second landlord for ownership testing
    const otherLandlordRegister = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `landlord-other-${Date.now()}@buscatunido.cl`,
        password: 'Password123!',
        firstName: 'Otro',
        lastName: 'Landlord',
        role: 'LANDLORD',
      },
    });
    otherLandlordToken = JSON.parse(otherLandlordRegister.payload).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should list pensions with pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pensions?page=1&limit=5',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.items).toBeDefined();
    expect(body.data.pagination).toBeDefined();
  });

  it('should reject student from creating a pension with 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pensions',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        title: 'Pensión No Autorizada Estudiante',
        description: 'Intento de creación sin rol landlord',
        address: 'Calle Falsa 123',
        city: 'Santiago',
        neighborhood: 'Centro',
        latitude: -33.4489,
        longitude: -70.6693,
        baseMonthlyPrice: 200000,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should allow landlord to create a pension with 201 Created', async () => {
    const uniqueTitle = `Residencia Nueva Test ${Date.now()}`;
    const res = await app.inject({
      method: 'POST',
      url: '/pensions',
      headers: {
        authorization: `Bearer ${landlordToken}`,
      },
      payload: {
        title: uniqueTitle,
        description: 'Excelente residencia estudiantil con todos los servicios.',
        address: 'Av. Libertador 1234',
        city: 'Santiago',
        neighborhood: 'República',
        latitude: -33.45,
        longitude: -70.66,
        baseMonthlyPrice: 270000,
        curfewTime: '23:00',
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    const createdPension = body.data;
    expect(createdPension.id).toBeDefined();

    // Prevent cross-user modification: second landlord attempting to update
    const patchForbiddenRes = await app.inject({
      method: 'PATCH',
      url: `/pensions/${createdPension.id}`,
      headers: {
        authorization: `Bearer ${otherLandlordToken}`,
      },
      payload: {
        title: 'Intento de Hackeo de Titulo',
      },
    });

    expect(patchForbiddenRes.statusCode).toBe(403);

    // Owner landlord updates successfully
    const patchOkRes = await app.inject({
      method: 'PATCH',
      url: `/pensions/${createdPension.id}`,
      headers: {
        authorization: `Bearer ${landlordToken}`,
      },
      payload: {
        description: 'Descripción actualizada por el dueño legal.',
      },
    });

    expect(patchOkRes.statusCode).toBe(200);
  });

  it('should filter pensions by coordinates and radiusKm', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pensions?latitude=-33.45&longitude=-70.66&radiusKm=10',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.items.length).toBeGreaterThan(0);
  });
});
