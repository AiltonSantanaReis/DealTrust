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
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(input: CreateCategoryRequest): Promise<CategoryResponse> {
    try {
      const slug = input.slug ?? createSlug(input.name);

      const [category] = await this.database.db
        .insert(categories)
        .values({
          name: input.name,
          slug,
          parentId: input.parentId,
          status: input.status
        })
        .returning();

      return mapCategory(requireCategory(category));
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

  async update(id: string, input: UpdateCategoryRequest): Promise<CategoryResponse> {
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
      const [category] = await this.database.db
        .update(categories)
        .set(values)
        .where(eq(categories.id, id))
        .returning();

      return mapCategory(requireFoundCategory(category));
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async archive(id: string): Promise<void> {
    const [category] = await this.database.db
      .update(categories)
      .set({
        status: "archived",
        updatedAt: new Date()
      })
      .where(eq(categories.id, id))
      .returning({ id: categories.id });

    if (!category) {
      throw new NotFoundException("Category not found.");
    }
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
