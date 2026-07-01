import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { loadApiConfig } from "./config/api-config.js";

export async function createApiApp(): Promise<NestFastifyApplication> {
  const config = loadApiConfig(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: config.apiBodyLimitBytes }),
    {
      bufferLogs: true
    }
  );

  if (config.apiCorsOrigins.length > 0) {
    app.enableCors({
      origin: [...config.apiCorsOrigins],
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["authorization", "content-type", "x-request-id"]
    });
  }

  app.enableShutdownHooks();

  return app;
}
