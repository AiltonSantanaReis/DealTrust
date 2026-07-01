import type {
  AdminProductListQuery,
  AdminProductListResponse,
  AdminProductResponse,
  CreateAdminProductRequest,
  ProductStatus,
  UpdateAdminProductRequest
} from "@dealtrust/contracts";
import { products } from "@dealtrust/db";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, ilike } from "drizzle-orm";
import { DatabaseService } from "../database/database.service.js";
import { isForeignKeyViolation } from "../database/postgres-errors.js";
import { mapProduct } from "./product-mapper.js";

type ProductUpdateValues = {
  categoryId?: string;
  brandId?: string;
  name?: string;
  model?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  status?: ProductStatus;
  updatedAt: Date;
};

@Injectable()
export class ProductsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(input: CreateAdminProductRequest): Promise<AdminProductResponse> {
    try {
      const [product] = await this.database.db
        .insert(products)
        .values({
          categoryId: input.categoryId,
          brandId: input.brandId,
          name: input.name,
          model: input.model,
          description: input.description,
          imageUrl: input.imageUrl,
          status: input.status
        })
        .returning();

      return mapProduct(requireProduct(product));
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async list(query: AdminProductListQuery): Promise<AdminProductListResponse> {
    const filters = [
      query.categoryId ? eq(products.categoryId, query.categoryId) : undefined,
      query.brandId ? eq(products.brandId, query.brandId) : undefined,
      query.status ? eq(products.status, query.status) : undefined,
      query.q ? ilike(products.name, `%${query.q}%`) : undefined
    ].filter((filter) => filter !== undefined);

    const rows = await this.database.db
      .select()
      .from(products)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(products.name), asc(products.id))
      .limit(query.limit);

    return {
      items: rows.map(mapProduct)
    };
  }

  async getById(id: string): Promise<AdminProductResponse> {
    return mapProduct(await this.getProductRowById(id));
  }

  async update(id: string, input: UpdateAdminProductRequest): Promise<AdminProductResponse> {
    const values: ProductUpdateValues = {
      updatedAt: new Date()
    };

    if (input.categoryId !== undefined) {
      values.categoryId = input.categoryId;
    }

    if (input.brandId !== undefined) {
      values.brandId = input.brandId;
    }

    if (input.name !== undefined) {
      values.name = input.name;
    }

    if (input.model !== undefined) {
      values.model = input.model;
    }

    if (input.description !== undefined) {
      values.description = input.description;
    }

    if (input.imageUrl !== undefined) {
      values.imageUrl = input.imageUrl;
    }

    if (input.status !== undefined) {
      values.status = input.status;
    }

    try {
      const [product] = await this.database.db
        .update(products)
        .set(values)
        .where(eq(products.id, id))
        .returning();

      return mapProduct(requireFoundProduct(product));
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async archive(id: string): Promise<void> {
    const [product] = await this.database.db
      .update(products)
      .set({
        status: "archived",
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning({ id: products.id });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }
  }

  private async getProductRowById(id: string) {
    const rows = await this.database.db.select().from(products).where(eq(products.id, id)).limit(1);

    return requireFoundProduct(rows.at(0));
  }
}

function requireProduct<T>(product: T | undefined): T {
  if (!product) {
    throw new Error("Product write did not return a row.");
  }

  return product;
}

function requireFoundProduct<T>(product: T | undefined): T {
  if (!product) {
    throw new NotFoundException("Product not found.");
  }

  return product;
}

function mapWriteError(error: unknown): Error {
  if (isForeignKeyViolation(error)) {
    return new BadRequestException("Category or brand does not exist.");
  }

  return error instanceof Error ? error : new Error("Unknown product write error.");
}
