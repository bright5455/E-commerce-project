import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

/**
 * All app configuration shared between the two entrypoints:
 *  - src/main.ts (a normal long-running server: local dev, EC2)
 *  - api/index.ts (a Vercel serverless function - never calls listen())
 *
 * Keeping this in one place means both entrypoints behave identically -
 * same middleware, same validation, same CORS/prefix/docs rules.
 */
export function configureApp(app: INestApplication): void {
  // Apply Helmet to all routes except Swagger UI so CSP doesn't block swagger-ui assets
  app.use((req: any, res: any, next: any) => {
    if (req.url?.startsWith('/api/docs')) return next();
    return helmet()(req, res, next);
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription('API documentation for the e-commerce platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Enable Swagger when not in production, or when ENABLE_SWAGGER=true (e.g. on EC2 for viewing docs)
  const enableSwagger =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true' ||
    process.env.ENABLE_SWAGGER === '1';
  if (enableSwagger) {
    SwaggerModule.setup('api/docs', app, document);
  }
}
