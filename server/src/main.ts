import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // All API routes will be prefixed with /api
  await app.listen(3001); // Server runs on port 3001
  console.log(`Server is running on: ${await app.getUrl()}`);
}
bootstrap();
