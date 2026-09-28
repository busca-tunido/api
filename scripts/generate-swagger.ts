import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createTestApp } from '../test/test-utils.js';

const run = async (): Promise<void> => {
  const app = await createTestApp();

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
