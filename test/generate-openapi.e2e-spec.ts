import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-utils.js';

describe('Generate OpenAPI', () => {
  it('should write openapi.json to web/src/lib/openapi.json', async () => {
    const app = await createTestApp();
    const config = new DocumentBuilder()
      .setTitle('BuscaTuNido API')
      .setDescription('Backend REST API for BuscaTuNido platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    const outputPath = path.resolve(process.cwd(), '../web/src/lib/openapi.json');
    await fs.writeFile(outputPath, JSON.stringify(document, null, 2));
    expect(document.openapi).toBeDefined();
    await app.close();
  });
});
