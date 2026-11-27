import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { env } from './env.js';

async function bootstrap(): Promise<void> {
  const fastifyAdapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter);

  const registerPlugin = app.register as unknown as (
    plugin: unknown,
    opts?: unknown,
  ) => Promise<unknown>;

  await registerPlugin(fastifyCompress, {
    encodings: ['br', 'gzip'],
    threshold: 1024,
  });

  await registerPlugin(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await registerPlugin(fastifyRateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', 'localhost'],
  });

  await registerPlugin(fastifyMultipart, {
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: 5,
    },
  });

  const corsOrigin = env.PUBLIC_CORS_ORIGIN;
  const allowedOrigins: Array<string | RegExp> = [corsOrigin];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swaggerDescription = [
    'Backend REST API de **BuscaTuNido** con arquitectura híbrida de persistencia políglota:',
    '- **PostgreSQL (SQL — Neon)**: `users`, `universities`, `university_email_domains`, `campus_areas`, `user_favorites`, `amenities`, `reports` y `pension_proposals`.',
    '- **MongoDB Atlas (NoSQL)**: `pensions` (con subdocumentos `rooms`, `images`, `nearbyUniversities` y `location` GeoJSON) y `reviews`.',
    '',
    '### Autenticación y Autorización',
    '- Lectura pública sin token: `/pensions`, `/universities`, `/cities`, `/pensions/:id/reviews`, `/health`.',
    '- Escritura, favoritos, reseñas, reportes, propuestas y gestión: JWT Bearer (`JwtAuthGuard`) y control de roles RBAC (`STUDENT`, `LANDLORD`, `MODERATOR`, `ADMIN`).',
    '',
    '### Formato de Respuesta y Errores',
    '- Todas las respuestas exitosas usan sobre estándar `{ success, data, timestamp }` y errores `{ success: false, statusCode, errorCode, message, path, timestamp }`.',
    '- Códigos estándar: `400` (validación DTO), `401` (JWT inválido/ausente), `403` (rol/propiedad), `404` (recurso inexistente), `409` (conflicto de unicidad), `429` (rate-limit).',
    '',
    '### Límites, Cuotas y Seguridad',
    '- Rate limit global: `120 req/min` por IP (y cuota dedicada para fallback multipart `/uploads/images`).',
    '- Subida directa S3/R2 (`/uploads/presign` + `/uploads/verify`): máximo `2 MB` WebP principal, `300 KB` miniatura, verificación de magic bytes `RIFF/WEBP`, `12` fotos máx. por pensión, `5` por habitación, `3` por reseña.',
    '- Seguridad: `Helmet`, CORS restringido, `ValidationPipe` (`whitelist + forbidNonWhitelisted`), validación `IsSafeImageUrl` y hashes `bcrypt`.',
  ].join('\n');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BuscaTuNido API')
    .setDescription(swaggerDescription)
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  if (env.NODE_ENV !== 'production') {
    let isTerminating = false;
    const handleShutdown = async (): Promise<void> => {
      if (isTerminating) {
        process.exit(1);
      }
      isTerminating = true;

      try {
        await app.close();
      } catch {
      } finally {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => {
      void handleShutdown();
    });
    process.on('SIGTERM', () => {
      void handleShutdown();
    });

    if (process.platform === 'win32' && process.stdin.isTTY) {
      import('node:readline')
        .then(({ createInterface }) => {
          const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          rl.on('SIGINT', () => {
            process.emit('SIGINT');
          });
        })
        .catch(() => {});
    }
  }

  await app.listen(env.PORT, '0.0.0.0');
}

await bootstrap();
