import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// TODO: Add Swagger documentation
// import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// TODO: Add helmet for security headers
// import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // TODO: Add global prefix for API versioning
  // app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    // TODO: Add these options for better error handling:
    // forbidNonWhitelisted: true,  // Throw error if unknown properties are sent
    // transformOptions: { enableImplicitConversion: true },
  }));

  // TODO: Add ClassSerializerInterceptor globally to auto-apply @Exclude decorators
  // app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // FIXME: Configure CORS properly for production - don't allow all origins
  // app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000' });
  app.enableCors();

  // TODO: Add Swagger setup
  // const config = new DocumentBuilder()
  //   .setTitle('E-Commerce API')
  //   .setDescription('API documentation for the e-commerce platform')
  //   .setVersion('1.0')
  //   .addBearerAuth()
  //   .build();
  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api/docs', app, document);

  // TODO: Add health check endpoint using @nestjs/terminus

  // TODO: Use environment variable for port
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();