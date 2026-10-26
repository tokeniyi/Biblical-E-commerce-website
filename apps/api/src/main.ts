import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { CORS_ORIGIN, PORT } from "./infrastructure/config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: CORS_ORIGIN,
    credentials: true,
  });

  await app.listen(PORT);
}

// Explicitly fire-and-forget: an unhandled rejection still crashes the process.
void bootstrap();
