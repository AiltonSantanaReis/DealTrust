import type {
  AdminProductVariantListQuery,
  AdminProductVariantListResponse,
  AdminProductVariantResponse,
  CreateAdminProductVariantRequest,
  ProductStatus,
  UpdateAdminProductVariantRequest
} from "@dealtrust/contracts";
import { productVariants } from "@dealtrust/db";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { type AdminActionContext, AdminAuditService } from "../audit/admin-audit.service.js";
import { DatabaseService } from "../database/database.service.js";
import { isForeignKeyViolation } from "../database/postgres-errors.js";
import { mapProductVariant } from "./product-variant-mapper.js";

type ProductVariantUpdateValues = {
  color?: string | null;
  voltage?: string | null;
  memory?: string | null;
  size?: string | null;
  edition?: string | null;
  status?: ProductStatus;
  updatedAt: Date;
};

@Injectable()
export class ProductVariantsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async create(
    input: CreateAdminProductVariantRequest,
    context: AdminActionContext
  ): Promise<AdminProductVariantResponse> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const [variant] = await tx
          .insert(productVariants)
          .values({
            productId: input.productId,
            color: input.color,
            voltage: input.voltage,
            memory: input.memory,
            size: input.size,
            edition: input.edition,
            status: input.status
          })
          .returning();

        const response = mapProductVariant(requireProductVariant(variant));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "create",
          entityType: "product_variant",
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

  async list(query: AdminProductVariantListQuery): Promise<AdminProductVariantListResponse> {
    const filters = [
      query.productId ? eq(productVariants.productId, query.productId) : undefined,
      query.status ? eq(productVariants.status, query.status) : undefined
    ].filter((filter) => filter !== undefined);

    const rows = await this.database.db
      .select()
      .from(productVariants)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(productVariants.productId), asc(productVariants.id))
      .limit(query.limit);

    return {
      items: rows.map(mapProductVariant)
    };
  }

  async getById(id: string): Promise<AdminProductVariantResponse> {
    return mapProductVariant(await this.getProductVariantRowById(id));
  }

  async update(
    id: string,
    input: UpdateAdminProductVariantRequest,
    context: AdminActionContext
  ): Promise<AdminProductVariantResponse> {
    const values: ProductVariantUpdateValues = {
      updatedAt: new Date()
    };

    if (input.color !== undefined) {
      values.color = input.color;
    }

    if (input.voltage !== undefined) {
      values.voltage = input.voltage;
    }

    if (input.memory !== undefined) {
      values.memory = input.memory;
    }

    if (input.size !== undefined) {
      values.size = input.size;
    }

    if (input.edition !== undefined) {
      values.edition = input.edition;
    }

    if (input.status !== undefined) {
      values.status = input.status;
    }

    try {
      return await this.database.db.transaction(async (tx) => {
        const beforeRows = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, id))
          .limit(1);
        const before = mapProductVariant(requireFoundProductVariant(beforeRows.at(0)));
        const [variant] = await tx
          .update(productVariants)
          .set(values)
          .where(eq(productVariants.id, id))
          .returning();

        const response = mapProductVariant(requireFoundProductVariant(variant));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "update",
          entityType: "product_variant",
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
      const beforeRows = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, id))
        .limit(1);
      const before = mapProductVariant(requireFoundProductVariant(beforeRows.at(0)));
      const [variant] = await tx
        .update(productVariants)
        .set({
          status: "archived",
          updatedAt: new Date()
        })
        .where(eq(productVariants.id, id))
        .returning();

      const after = mapProductVariant(requireFoundProductVariant(variant));
      await this.adminAuditService.recordWithExecutor(tx, {
        actor: context.actor,
        action: "delete",
        entityType: "product_variant",
        entityId: after.id,
        request: context.request,
        before,
        after
      });
    });
  }

  private async getProductVariantRowById(id: string) {
    const rows = await this.database.db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, id))
      .limit(1);

    return requireFoundProductVariant(rows.at(0));
  }
}

function requireProductVariant<T>(variant: T | undefined): T {
  if (!variant) {
    throw new Error("Product variant write did not return a row.");
  }

  return variant;
}

function requireFoundProductVariant<T>(variant: T | undefined): T {
  if (!variant) {
    throw new NotFoundException("Product variant not found.");
  }

  return variant;
}

function mapWriteError(error: unknown): Error {
  if (isForeignKeyViolation(error)) {
    return new BadRequestException("Product does not exist.");
  }

  return error instanceof Error ? error : new Error("Unknown product variant write error.");
}
