import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Allow frontend to connect
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Electron UI and Launcher Portal
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    credentials: true,
  });

  // ✅ Global validation (VERY IMPORTANT)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // removes extra fields
      forbidNonWhitelisted: true, // throws error if extra fields sent
      transform: true, // converts types automatically
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
