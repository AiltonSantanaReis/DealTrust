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
import { type AdminActionContext, AdminAuditService } from "../audit/admin-audit.service.js";
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
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async create(
    input: CreateAdminProductRequest,
    context: AdminActionContext
  ): Promise<AdminProductResponse> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const [product] = await tx
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

        const response = mapProduct(requireProduct(product));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "create",
          entityType: "product",
          entityId: response.id,
          request: context.request,
          after: response
        });

        return response;
      });
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

  async update(
    id: string,
    input: UpdateAdminProductRequest,
    context: AdminActionContext
  ): Promise<AdminProductResponse> {
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
      return await this.database.db.transaction(async (tx) => {
        const beforeRows = await tx.select().from(products).where(eq(products.id, id)).limit(1);
        const before = mapProduct(requireFoundProduct(beforeRows.at(0)));
        const [product] = await tx
          .update(products)
          .set(values)
          .where(eq(products.id, id))
          .returning();

        const response = mapProduct(requireFoundProduct(product));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "update",
          entityType: "product",
          entityId: response.id,
          request: context.request,
          before,
          after: response
        });

        return response;
      });
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async archive(id: string, context: AdminActionContext): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      const beforeRows = await tx.select().from(products).where(eq(products.id, id)).limit(1);
      const before = mapProduct(requireFoundProduct(beforeRows.at(0)));
      const [product] = await tx
        .update(products)
        .set({
          status: "archived",
          updatedAt: new Date()
        })
        .where(eq(products.id, id))
        .returning();

      const after = mapProduct(requireFoundProduct(product));
      await this.adminAuditService.recordWithExecutor(tx, {
        actor: context.actor,
        action: "delete",
        entityType: "product",
        entityId: after.id,
        request: context.request,
        before,
        after
      });
    });
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
