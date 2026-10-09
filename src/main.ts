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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BuscaTuNido API')
    .setDescription('Backend REST API for BuscaTuNido platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  if (env.NODE_ENV !== 'production') {
    app.enableShutdownHooks();

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
