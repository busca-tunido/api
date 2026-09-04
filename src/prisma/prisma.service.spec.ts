import { describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service.js';
import { SOFT_DELETE_MODELS } from './prisma.extension.js';

describe('PrismaService', () => {
  it('should be defined and expose soft delete models', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
    expect(typeof service.user.findMany).toBe('function');
    expect(typeof service.pension.findMany).toBe('function');
    expect(typeof service.review.findMany).toBe('function');
  });

  it('should include all required domain models in SOFT_DELETE_MODELS', () => {
    expect(SOFT_DELETE_MODELS.has('User')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('Pension')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('Room')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('PensionImage')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('Amenity')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('Review')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('Report')).toBe(true);
    expect(SOFT_DELETE_MODELS.has('University')).toBe(true);
  });

  it('should have lifecycle hooks defined', async () => {
    const service = new PrismaService();
    expect(typeof service.onModuleInit).toBe('function');
    expect(typeof service.onModuleDestroy).toBe('function');

    const connectSpy = vi.spyOn(service, '$connect').mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalled();

    const disconnectSpy = vi.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    const poolEndSpy = vi.spyOn((service as unknown as { pool: { end: () => Promise<void> } }).pool, 'end').mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
    expect(poolEndSpy).toHaveBeenCalled();
  });
});
