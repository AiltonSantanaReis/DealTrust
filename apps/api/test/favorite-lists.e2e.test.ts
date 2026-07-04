import "reflect-metadata";
import {
  authSessionSchema,
  favoriteListItemResponseSchema,
  favoriteListListResponseSchema,
  favoriteListResponseSchema
} from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import {
  brands,
  categories,
  createDatabaseClient,
  createSqlClient,
  products,
  productVariants,
  runMigrations
} from "@dealtrust/db";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const authJwtSecret = "test-secret-with-at-least-thirty-two-chars";
const schemaResetLockId = 332_001;

describe.skipIf(!testDatabaseUrl)("favorite lists", () => {
  let app: NestFastifyApplication | undefined;
  let db: Database;
  let sqlClient: SqlClient | undefined;
  let lockAcquired = false;
  const originalEnv = process.env;

  beforeAll(async () => {
    const databaseUrl = requireTestDatabaseUrl(testDatabaseUrl);
    sqlClient = createSqlClient(databaseUrl, {
      max: 1,
      onnotice: () => undefined
    });
    db = createDatabaseClient(sqlClient);

    await acquireSchemaResetLock(requireValue(sqlClient));
    lockAcquired = true;
    await resetPublicSchema(requireValue(sqlClient));
    await runMigrations(db);

    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      API_PORT: "0",
      DATABASE_URL: databaseUrl,
      DATABASE_MAX_CONNECTIONS: "2",
      VALKEY_URL: "redis://localhost:6379",
      AUTH_JWT_SECRET: authJwtSecret,
      AUTH_ACCESS_TOKEN_TTL_SECONDS: "900"
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (sqlClient) {
      if (lockAcquired) {
        await releaseSchemaResetLock(sqlClient);
      }

      await sqlClient.end({ timeout: 1 });
    }

    process.env = originalEnv;
  });

  it("requires authentication and manages user-owned favorite lists", async () => {
    const anonymousResponse = await injectHttp("GET", "/favorite-lists");
    expect(anonymousResponse.statusCode).toBe(401);

    const fixture = await createVariantFixture();
    const userSession = await registerUser("favorites.user@example.com");
    const otherSession = await registerUser("favorites.other@example.com");

    const createResponse = await injectJson("POST", "/favorite-lists", userSession.accessToken, {
      name: "  Produtos acompanhados  "
    });
    expect(createResponse.statusCode).toBe(201);

    const list = favoriteListResponseSchema.parse(JSON.parse(createResponse.payload));
    expect(list.name).toBe("Produtos acompanhados");
    expect(list.visibility).toBe("private");
    expect(list.itemCount).toBe(0);

    const otherUserReadResponse = await injectHttp(
      "GET",
      `/favorite-lists/${list.id}`,
      otherSession.accessToken
    );
    expect(otherUserReadResponse.statusCode).toBe(404);

    const inactiveVariantResponse = await injectJson(
      "POST",
      `/favorite-lists/${list.id}/items`,
      userSession.accessToken,
      {
        productVariantId: fixture.draftVariantId
      }
    );
    expect(inactiveVariantResponse.statusCode).toBe(400);

    const inactiveProductResponse = await injectJson(
      "POST",
      `/favorite-lists/${list.id}/items`,
      userSession.accessToken,
      {
        productVariantId: fixture.hiddenProductVariantId
      }
    );
    expect(inactiveProductResponse.statusCode).toBe(400);

    const addItemResponse = await injectJson(
      "POST",
      `/favorite-lists/${list.id}/items`,
      userSession.accessToken,
      {
        productVariantId: fixture.activeVariantId
      }
    );
    expect(addItemResponse.statusCode).toBe(201);

    const item = favoriteListItemResponseSchema.parse(JSON.parse(addItemResponse.payload));
    expect(item.productVariantId).toBe(fixture.activeVariantId);
    expect(item.productName).toBe("Demo Console Pro");
    expect(item.variant.status).toBe("active");

    const duplicateItemResponse = await injectJson(
      "POST",
      `/favorite-lists/${list.id}/items`,
      userSession.accessToken,
      {
        productVariantId: fixture.activeVariantId
      }
    );
    expect(duplicateItemResponse.statusCode).toBe(409);

    const otherUserAddResponse = await injectJson(
      "POST",
      `/favorite-lists/${list.id}/items`,
      otherSession.accessToken,
      {
        productVariantId: fixture.activeVariantId
      }
    );
    expect(otherUserAddResponse.statusCode).toBe(404);

    const listResponse = await injectHttp("GET", "/favorite-lists", userSession.accessToken);
    expect(listResponse.statusCode).toBe(200);

    const lists = favoriteListListResponseSchema.parse(JSON.parse(listResponse.payload));
    expect(lists.items.map((favoriteList) => favoriteList.id)).toEqual([list.id]);
    expect(requireValue(lists.items.at(0)).itemCount).toBe(1);

    const invalidUpdateResponse = await injectJson(
      "PATCH",
      `/favorite-lists/${list.id}`,
      userSession.accessToken,
      {}
    );
    expect(invalidUpdateResponse.statusCode).toBe(400);

    const updateResponse = await injectJson(
      "PATCH",
      `/favorite-lists/${list.id}`,
      userSession.accessToken,
      {
        name: "Ofertas prioritárias",
        visibility: "shared"
      }
    );
    expect(updateResponse.statusCode).toBe(200);

    const updatedList = favoriteListResponseSchema.parse(JSON.parse(updateResponse.payload));
    expect(updatedList.name).toBe("Ofertas prioritárias");
    expect(updatedList.visibility).toBe("shared");
    expect(updatedList.itemCount).toBe(1);

    const sharedListResponse = await injectHttp(
      "GET",
      "/favorite-lists?visibility=shared",
      userSession.accessToken
    );
    expect(sharedListResponse.statusCode).toBe(200);
    expect(
      favoriteListListResponseSchema
        .parse(JSON.parse(sharedListResponse.payload))
        .items.map((favoriteList) => favoriteList.id)
    ).toEqual([list.id]);

    const removeItemResponse = await injectHttp(
      "DELETE",
      `/favorite-lists/${list.id}/items/${fixture.activeVariantId}`,
      userSession.accessToken
    );
    expect(removeItemResponse.statusCode).toBe(204);

    const emptyListResponse = await injectHttp(
      "GET",
      `/favorite-lists/${list.id}`,
      userSession.accessToken
    );
    expect(emptyListResponse.statusCode).toBe(200);
    expect(favoriteListResponseSchema.parse(JSON.parse(emptyListResponse.payload)).itemCount).toBe(
      0
    );

    const deleteListResponse = await injectHttp(
      "DELETE",
      `/favorite-lists/${list.id}`,
      userSession.accessToken
    );
    expect(deleteListResponse.statusCode).toBe(204);

    const deletedListResponse = await injectHttp(
      "GET",
      `/favorite-lists/${list.id}`,
      userSession.accessToken
    );
    expect(deletedListResponse.statusCode).toBe(404);
  });

  async function registerUser(email: string) {
    const response = await injectJson("POST", "/auth/register", undefined, {
      name: "Favorite Test User",
      email,
      password: "ValidTestPassword123!"
    });

    expect(response.statusCode).toBe(201);

    return authSessionSchema.parse(JSON.parse(response.payload));
  }

  async function createVariantFixture() {
    const [category] = await db
      .insert(categories)
      .values({
        name: "Electronics",
        slug: "electronics",
        status: "active"
      })
      .returning({
        id: categories.id
      });

    const [brand] = await db
      .insert(brands)
      .values({
        name: "Example Electronics",
        slug: "example-electronics"
      })
      .returning({
        id: brands.id
      });

    const [activeProduct] = await db
      .insert(products)
      .values({
        categoryId: requireValue(category).id,
        brandId: requireValue(brand).id,
        name: "Demo Console Pro",
        status: "active"
      })
      .returning({
        id: products.id
      });

    const [hiddenProduct] = await db
      .insert(products)
      .values({
        categoryId: requireValue(category).id,
        brandId: requireValue(brand).id,
        name: "Hidden Console Pro",
        status: "draft"
      })
      .returning({
        id: products.id
      });

    const [activeVariant] = await db
      .insert(productVariants)
      .values({
        productId: requireValue(activeProduct).id,
        color: "Black",
        voltage: "bivolt",
        memory: "1 TB",
        status: "active"
      })
      .returning({
        id: productVariants.id
      });

    const [draftVariant] = await db
      .insert(productVariants)
      .values({
        productId: requireValue(activeProduct).id,
        color: "White",
        status: "draft"
      })
      .returning({
        id: productVariants.id
      });

    const [hiddenProductVariant] = await db
      .insert(productVariants)
      .values({
        productId: requireValue(hiddenProduct).id,
        color: "Silver",
        status: "active"
      })
      .returning({
        id: productVariants.id
      });

    return {
      activeVariantId: requireValue(activeVariant).id,
      draftVariantId: requireValue(draftVariant).id,
      hiddenProductVariantId: requireValue(hiddenProductVariant).id
    };
  }

  async function injectHttp(method: "DELETE" | "GET", url: string, accessToken?: string) {
    return requireValue(app)
      .getHttpAdapter()
      .getInstance()
      .inject({
        method,
        url,
        ...(accessToken
          ? {
              headers: {
                authorization: `Bearer ${accessToken}`
              }
            }
          : {})
      });
  }

  async function injectJson(
    method: "PATCH" | "POST",
    url: string,
    accessToken: string | undefined,
    payload: unknown
  ) {
    return requireValue(app)
      .getHttpAdapter()
      .getInstance()
      .inject({
        method,
        url,
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        payload: JSON.stringify(payload)
      });
  }
});

async function acquireSchemaResetLock(sqlClient: SqlClient): Promise<void> {
  await sqlClient`select pg_advisory_lock(${schemaResetLockId})`;
}

async function releaseSchemaResetLock(sqlClient: SqlClient): Promise<void> {
  await sqlClient`select pg_advisory_unlock(${schemaResetLockId})`;
}

async function resetPublicSchema(sqlClient: SqlClient): Promise<void> {
  await sqlClient`drop schema if exists drizzle cascade`;
  await sqlClient`drop schema if exists public cascade`;
  await sqlClient`create schema public`;
}

function requireTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for favorite list integration tests.");
  }

  const parsedUrl = new URL(databaseUrl);

  if (!parsedUrl.pathname.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must point to a database whose name ends with _test.");
  }

  return databaseUrl;
}

function requireValue<T>(value: T | undefined): T {
  if (!value) {
    throw new Error("Expected value.");
  }

  return value;
}
