import type {
  BrandListQuery,
  BrandListResponse,
  BrandResponse,
  CreateBrandRequest,
  UpdateBrandRequest
} from "@dealtrust/contracts";
import { brands } from "@dealtrust/db";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { asc, eq, ilike } from "drizzle-orm";
import { type AdminActionContext, AdminAuditService } from "../audit/admin-audit.service.js";
import { DatabaseService } from "../database/database.service.js";
import { isForeignKeyViolation, isUniqueViolation } from "../database/postgres-errors.js";
import { mapBrand } from "./brand-mapper.js";
import { createSlug } from "./slug.js";

type BrandUpdateValues = {
  name?: string;
  slug?: string;
  updatedAt: Date;
};

@Injectable()
export class BrandsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async create(input: CreateBrandRequest, context: AdminActionContext): Promise<BrandResponse> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const slug = input.slug ?? createSlug(input.name);

        const [brand] = await tx
          .insert(brands)
          .values({
            name: input.name,
            slug
          })
          .returning();

        const response = mapBrand(requireBrand(brand));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "create",
          entityType: "brand",
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

  async list(query: BrandListQuery): Promise<BrandListResponse> {
    const rows = await this.database.db
      .select()
      .from(brands)
      .where(query.q ? ilike(brands.name, `%${query.q}%`) : undefined)
      .orderBy(asc(brands.name), asc(brands.id))
      .limit(query.limit);

    return {
      items: rows.map(mapBrand)
    };
  }

  async getById(id: string): Promise<BrandResponse> {
    return mapBrand(await this.getBrandRowById(id));
  }

  async update(
    id: string,
    input: UpdateBrandRequest,
    context: AdminActionContext
  ): Promise<BrandResponse> {
    const values: BrandUpdateValues = {
      updatedAt: new Date()
    };

    if (input.name !== undefined) {
      values.name = input.name;
    }

    if (input.slug !== undefined) {
      values.slug = input.slug;
    }

    try {
      return await this.database.db.transaction(async (tx) => {
        const beforeRows = await tx.select().from(brands).where(eq(brands.id, id)).limit(1);
        const before = mapBrand(requireFoundBrand(beforeRows.at(0)));
        const [brand] = await tx.update(brands).set(values).where(eq(brands.id, id)).returning();

        const response = mapBrand(requireFoundBrand(brand));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "update",
          entityType: "brand",
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

  async delete(id: string, context: AdminActionContext): Promise<void> {
    try {
      await this.database.db.transaction(async (tx) => {
        const beforeRows = await tx.select().from(brands).where(eq(brands.id, id)).limit(1);
        const before = mapBrand(requireFoundBrand(beforeRows.at(0)));
        const [brand] = await tx.delete(brands).where(eq(brands.id, id)).returning({
          id: brands.id
        });

        if (!brand) {
          throw new NotFoundException("Brand not found.");
        }

        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "delete",
          entityType: "brand",
          entityId: before.id,
          request: context.request,
          before
        });
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException("Brand is in use.");
      }

      throw error;
    }
  }

  private async getBrandRowById(id: string) {
    const rows = await this.database.db.select().from(brands).where(eq(brands.id, id)).limit(1);

    return requireFoundBrand(rows.at(0));
  }
}

function requireBrand<T>(brand: T | undefined): T {
  if (!brand) {
    throw new Error("Brand write did not return a row.");
  }

  return brand;
}

function requireFoundBrand<T>(brand: T | undefined): T {
  if (!brand) {
    throw new NotFoundException("Brand not found.");
  }

  return brand;
}

function mapWriteError(error: unknown): Error {
  if (isUniqueViolation(error)) {
    return new ConflictException("Brand slug already exists.");
  }

  if (error instanceof Error && error.message === "Could not create a valid slug.") {
    return new BadRequestException(error.message);
  }

  return error instanceof Error ? error : new Error("Unknown brand write error.");
}
