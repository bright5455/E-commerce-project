import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  configureApp(app);

  const port = process.env.PORT || 3000;

  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`API Documentation available at http://localhost:${port}/api/docs`);
  console.log(`Health check available at http://localhost:${port}/api/v1/health`);
}

bootstrap();