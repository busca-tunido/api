import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../dist/app.module.js';

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    logger: false,
    abortOnError: false,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BuscaTuNido API')
    .setDescription('Backend REST API for BuscaTuNido platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const outputPath = path.resolve(import.meta.dirname, '../../web/src/lib/openapi.json');
  await fs.writeFile(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  await app.close();
  process.exit(0);
}

void exportOpenApi();
