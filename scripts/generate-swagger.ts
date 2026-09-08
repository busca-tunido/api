import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module.js';

try {
  process.loadEnvFile?.();
} catch {}

const run = async (): Promise<void> => {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BuscaTuNido API')
    .setDescription('Backend REST API for BuscaTuNido platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const outputPath = path.resolve(process.cwd(), '../web/src/lib/openapi.json');
  await fs.writeFile(outputPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI schema written to: ${outputPath}`);

  await app.close();
};

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
