import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { SqlPrismaService } from './sql-prisma/sql-prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  let mockPrisma: { $runCommandRaw: ReturnType<typeof vi.fn> };
  let mockSqlPrisma: { $queryRaw: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrisma = {
      $runCommandRaw: vi.fn().mockResolvedValue({ ok: 1 }),
    };
    mockSqlPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: SqlPrismaService,
          useValue: mockSqlPrisma,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return connected status when both MongoDB and PostgreSQL checks succeed', async () => {
      const res = await appController.getHealth();
      expect(res).toEqual({
        status: 'ok',
        database: 'connected',
        databases: {
          mongodb: 'connected',
          postgresql: 'connected',
        },
      });
      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({ ping: 1 });
      expect(mockSqlPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return disconnected status when MongoDB ping fails', async () => {
      mockPrisma.$runCommandRaw.mockRejectedValueOnce(new Error('Connection timeout'));
      const res = await appController.getHealth();
      expect(res).toEqual({
        status: 'error',
        database: 'disconnected',
        details: 'MongoDB: Connection timeout',
        databases: {
          mongodb: 'disconnected',
          postgresql: 'connected',
        },
      });
    });

    it('should return disconnected status when PostgreSQL query fails', async () => {
      mockSqlPrisma.$queryRaw.mockRejectedValueOnce(new Error('SQL connection refused'));
      const res = await appController.getHealth();
      expect(res).toEqual({
        status: 'error',
        database: 'disconnected',
        details: 'PostgreSQL: SQL connection refused',
        databases: {
          mongodb: 'connected',
          postgresql: 'disconnected',
        },
      });
    });

    it('should report both failures when both databases fail', async () => {
      mockPrisma.$runCommandRaw.mockRejectedValueOnce(new Error('Mongo down'));
      mockSqlPrisma.$queryRaw.mockRejectedValueOnce(new Error('SQL down'));
      const res = await appController.getHealth();
      expect(res).toEqual({
        status: 'error',
        database: 'disconnected',
        details: 'MongoDB: Mongo down; PostgreSQL: SQL down',
        databases: {
          mongodb: 'disconnected',
          postgresql: 'disconnected',
        },
      });
    });
  });
});
