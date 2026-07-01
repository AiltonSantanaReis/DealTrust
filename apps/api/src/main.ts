import "reflect-metadata";
import { API_CONFIG, type ApiConfig } from "./config/api-config.js";
import { createApiApp } from "./create-api-app.js";

async function bootstrap(): Promise<void> {
  const app = await createApiApp();
  const config = app.get<ApiConfig>(API_CONFIG);

  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();
