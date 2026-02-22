import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
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

  const port = process.env.PORT || 3000;

  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`API Documentation available at http://localhost:${port}/api/docs`);
  console.log(`Health check available at http://localhost:${port}/api/v1/health`);
}

bootstrap();