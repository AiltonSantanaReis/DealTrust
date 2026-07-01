import type {
  CatalogStatus,
  CategoryListQuery,
  CategoryListResponse,
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest
} from "@dealtrust/contracts";
import { categories } from "@dealtrust/db";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { and, asc, eq, ilike } from "drizzle-orm";
import { type AdminActionContext, AdminAuditService } from "../audit/admin-audit.service.js";
import { DatabaseService } from "../database/database.service.js";
import { isForeignKeyViolation, isUniqueViolation } from "../database/postgres-errors.js";
import { mapCategory } from "./category-mapper.js";
import { createSlug } from "./slug.js";

type CategoryUpdateValues = {
  name?: string;
  slug?: string;
  parentId?: string | null;
  status?: CatalogStatus;
  updatedAt: Date;
};

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async create(
    input: CreateCategoryRequest,
    context: AdminActionContext
  ): Promise<CategoryResponse> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const slug = input.slug ?? createSlug(input.name);

        const [category] = await tx
          .insert(categories)
          .values({
            name: input.name,
            slug,
            parentId: input.parentId,
            status: input.status
          })
          .returning();

        const response = mapCategory(requireCategory(category));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "create",
          entityType: "category",
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

  async list(query: CategoryListQuery): Promise<CategoryListResponse> {
    const filters = [
      query.status ? eq(categories.status, query.status) : undefined,
      query.q ? ilike(categories.name, `%${query.q}%`) : undefined
    ].filter((filter) => filter !== undefined);

    const rows = await this.database.db
      .select()
      .from(categories)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(categories.name), asc(categories.id))
      .limit(query.limit);

    return {
      items: rows.map(mapCategory)
    };
  }

  async getById(id: string): Promise<CategoryResponse> {
    return mapCategory(await this.getCategoryRowById(id));
  }

  async update(
    id: string,
    input: UpdateCategoryRequest,
    context: AdminActionContext
  ): Promise<CategoryResponse> {
    const values: CategoryUpdateValues = {
      updatedAt: new Date()
    };

    if (input.name !== undefined) {
      values.name = input.name;
    }

    if (input.slug !== undefined) {
      values.slug = input.slug;
    }

    if (input.parentId !== undefined) {
      values.parentId = input.parentId;
    }

    if (input.status !== undefined) {
      values.status = input.status;
    }

    try {
      return await this.database.db.transaction(async (tx) => {
        const beforeRows = await tx.select().from(categories).where(eq(categories.id, id)).limit(1);
        const before = mapCategory(requireFoundCategory(beforeRows.at(0)));
        const [category] = await tx
          .update(categories)
          .set(values)
          .where(eq(categories.id, id))
          .returning();

        const response = mapCategory(requireFoundCategory(category));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "update",
          entityType: "category",
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
      const beforeRows = await tx.select().from(categories).where(eq(categories.id, id)).limit(1);
      const before = mapCategory(requireFoundCategory(beforeRows.at(0)));
      const [category] = await tx
        .update(categories)
        .set({
          status: "archived",
          updatedAt: new Date()
        })
        .where(eq(categories.id, id))
        .returning();

      const after = mapCategory(requireFoundCategory(category));
      await this.adminAuditService.recordWithExecutor(tx, {
        actor: context.actor,
        action: "delete",
        entityType: "category",
        entityId: after.id,
        request: context.request,
        before,
        after
      });
    });
  }

  private async getCategoryRowById(id: string) {
    const rows = await this.database.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    return requireFoundCategory(rows.at(0));
  }
}

function requireCategory<T>(category: T | undefined): T;
function requireCategory<T>(category: T | undefined): T {
  if (!category) {
    throw new Error("Category write did not return a row.");
  }

  return category;
}

function requireFoundCategory<T>(category: T | undefined): T {
  if (!category) {
    throw new NotFoundException("Category not found.");
  }

  return category;
}

function mapWriteError(error: unknown): Error {
  if (isUniqueViolation(error)) {
    return new ConflictException("Category slug already exists.");
  }

  if (isForeignKeyViolation(error)) {
    return new BadRequestException("Parent category does not exist.");
  }

  if (error instanceof Error && error.message === "Could not create a valid slug.") {
    return new BadRequestException(error.message);
  }

  return error instanceof Error ? error : new Error("Unknown category write error.");
}
