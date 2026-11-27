import { Test, type TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { SQL_SOFT_DELETE_MODELS } from './sql-prisma.extension.js';
import { SqlPrismaService } from './sql-prisma.service.js';

describe('SqlPrismaService', () => {
  it('should be defined and expose relational PostgreSQL models', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SqlPrismaService],
    }).compile();

    const service = module.get<SqlPrismaService>(SqlPrismaService);
    expect(service).toBeDefined();
    expect(typeof service.user.findMany).toBe('function');
    expect(typeof service.university.findMany).toBe('function');
    expect(typeof service.universityEmailDomain.findMany).toBe('function');
    expect(typeof service.campusArea.findMany).toBe('function');
    expect(typeof service.userFavorite.findMany).toBe('function');
    expect(typeof service.amenity.findMany).toBe('function');
    expect(typeof service.report.findMany).toBe('function');
    expect(typeof service.pensionProposal.findMany).toBe('function');
  });

  it('should include all soft-deleted relational models in SQL_SOFT_DELETE_MODELS', () => {
    expect(SQL_SOFT_DELETE_MODELS.has('User')).toBe(true);
    expect(SQL_SOFT_DELETE_MODELS.has('University')).toBe(true);
    expect(SQL_SOFT_DELETE_MODELS.has('Amenity')).toBe(true);
    expect(SQL_SOFT_DELETE_MODELS.has('Report')).toBe(true);
    expect(SQL_SOFT_DELETE_MODELS.has('Pension')).toBe(false);
  });

  it('should skip database connection when SKIP_DB_CONNECT is true', async () => {
    const previousSkip = process.env.SKIP_DB_CONNECT;
    process.env.SKIP_DB_CONNECT = 'true';
    try {
      const service = new SqlPrismaService();
      const connectSpy = vi.spyOn(service, '$connect').mockResolvedValue(undefined);
      const disconnectSpy = vi.spyOn(service, '$disconnect').mockResolvedValue(undefined);
      await service.onModuleInit();
      await service.onModuleDestroy();
      expect(connectSpy).not.toHaveBeenCalled();
      expect(disconnectSpy).not.toHaveBeenCalled();
    } finally {
      if (previousSkip === undefined) {
        delete process.env.SKIP_DB_CONNECT;
      } else {
        process.env.SKIP_DB_CONNECT = previousSkip;
      }
    }
  });
});
