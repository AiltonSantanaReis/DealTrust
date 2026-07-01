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
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(input: CreateBrandRequest): Promise<BrandResponse> {
    try {
      const slug = input.slug ?? createSlug(input.name);

      const [brand] = await this.database.db
        .insert(brands)
        .values({
          name: input.name,
          slug
        })
        .returning();

      return mapBrand(requireBrand(brand));
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

  async update(id: string, input: UpdateBrandRequest): Promise<BrandResponse> {
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
      const [brand] = await this.database.db
        .update(brands)
        .set(values)
        .where(eq(brands.id, id))
        .returning();

      return mapBrand(requireFoundBrand(brand));
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const [brand] = await this.database.db
        .delete(brands)
        .where(eq(brands.id, id))
        .returning({ id: brands.id });

      if (!brand) {
        throw new NotFoundException("Brand not found.");
      }
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
