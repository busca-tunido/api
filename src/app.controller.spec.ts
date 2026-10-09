import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  let mockPrisma: { $runCommandRaw: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrisma = {
      $runCommandRaw: vi.fn().mockResolvedValue({ ok: 1 }),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
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
    it('should return connected status when ping succeeds', async () => {
      const res = await appController.getHealth();
      expect(res).toEqual({ status: 'ok', database: 'connected' });
      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({ ping: 1 });
    });

    it('should return disconnected status when ping fails', async () => {
      mockPrisma.$runCommandRaw.mockRejectedValueOnce(new Error('Connection timeout'));
      const res = await appController.getHealth();
      expect(res).toEqual({
        status: 'error',
        database: 'disconnected',
        details: 'Connection timeout',
      });
    });
  });
});
