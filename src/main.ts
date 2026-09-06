import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins: Array<string | RegExp> = [
    'https://web-theta-three-8zz8it8ws2.vercel.app',
    /https:\/\/.*\.vercel\.app$/,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  if (corsOrigin && !allowedOrigins.includes(corsOrigin)) {
    allowedOrigins.unshift(corsOrigin);
  }

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

  const port = configService.get<number>('PORT');
  if (!port) {
    throw new Error('PORT environment variable is required.');
  }
  await app.listen(port);
}

await bootstrap();
