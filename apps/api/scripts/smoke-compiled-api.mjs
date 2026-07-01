process.env.NODE_ENV = "test";
process.env.API_PORT = "0";
process.env.DATABASE_URL = "postgres://dealtrust:dealtrust@localhost:5432/dealtrust_test";
process.env.DATABASE_MAX_CONNECTIONS = "1";
process.env.VALKEY_URL = "redis://localhost:6379";

let app;

try {
  const { createApiApp } = await import("../dist/src/create-api-app.js");
  app = await createApiApp();
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const response = await app.getHttpAdapter().getInstance().inject({
    method: "GET",
    url: "/health"
  });

  if (response.statusCode !== 200) {
    throw new Error(`Expected /health to return 200, received ${response.statusCode}.`);
  }

  const payload = JSON.parse(response.payload);

  if (payload.status !== "ok" || payload.service !== "dealtrust-api") {
    throw new Error(`Unexpected /health payload: ${response.payload}`);
  }

  console.log("compiled API health smoke passed");
} finally {
  if (app) {
    await app.close();
  }
}
