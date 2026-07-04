import type {
  AuthUser,
  CreateFavoriteListRequest,
  FavoriteListItemRequest,
  FavoriteListItemResponse,
  FavoriteListListResponse,
  FavoriteListQuery,
  FavoriteListResponse,
  UpdateFavoriteListRequest
} from "@dealtrust/contracts";
import { favoriteListItems, favoriteLists, products, productVariants } from "@dealtrust/db";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { DatabaseService } from "../database/database.service.js";
import { isForeignKeyViolation, isUniqueViolation } from "../database/postgres-errors.js";
import {
  type FavoriteListItemRow,
  type FavoriteListRow,
  mapFavoriteList,
  mapFavoriteListItem
} from "./favorite-list-mapper.js";

@Injectable()
export class FavoriteListsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(input: CreateFavoriteListRequest, user: AuthUser): Promise<FavoriteListResponse> {
    const [list] = await this.database.db
      .insert(favoriteLists)
      .values({
        userId: user.id,
        name: input.name,
        visibility: input.visibility
      })
      .returning({
        id: favoriteLists.id
      });

    return this.getById(requireCreatedList(list).id, user);
  }

  async list(query: FavoriteListQuery, user: AuthUser): Promise<FavoriteListListResponse> {
    const filters = [
      eq(favoriteLists.userId, user.id),
      query.visibility ? eq(favoriteLists.visibility, query.visibility) : undefined
    ].filter((filter) => filter !== undefined);

    const rows = await this.database.db
      .select({
        id: favoriteLists.id,
        name: favoriteLists.name,
        visibility: favoriteLists.visibility,
        createdAt: favoriteLists.createdAt,
        updatedAt: favoriteLists.updatedAt
      })
      .from(favoriteLists)
      .where(and(...filters))
      .orderBy(asc(favoriteLists.createdAt), asc(favoriteLists.id))
      .limit(query.limit);

    const itemsByListId = await this.selectItemsByListIds(rows.map((row) => row.id));

    return {
      items: rows.map((row) => mapFavoriteList(row, itemsByListId.get(row.id) ?? []))
    };
  }

  async getById(id: string, user: AuthUser): Promise<FavoriteListResponse> {
    const list = await this.getOwnedListRow(id, user.id);
    const itemsByListId = await this.selectItemsByListIds([list.id]);

    return mapFavoriteList(list, itemsByListId.get(list.id) ?? []);
  }

  async update(
    id: string,
    input: UpdateFavoriteListRequest,
    user: AuthUser
  ): Promise<FavoriteListResponse> {
    const [list] = await this.database.db
      .update(favoriteLists)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(and(eq(favoriteLists.id, id), eq(favoriteLists.userId, user.id)))
      .returning({
        id: favoriteLists.id
      });

    if (!list) {
      throw new NotFoundException("Favorite list not found.");
    }

    return this.getById(list.id, user);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const [list] = await this.database.db
      .delete(favoriteLists)
      .where(and(eq(favoriteLists.id, id), eq(favoriteLists.userId, user.id)))
      .returning({
        id: favoriteLists.id
      });

    if (!list) {
      throw new NotFoundException("Favorite list not found.");
    }
  }

  async addItem(
    listId: string,
    input: FavoriteListItemRequest,
    user: AuthUser
  ): Promise<FavoriteListItemResponse> {
    await this.ensureOwnedList(listId, user.id);
    await this.ensureActiveProductVariant(input.productVariantId);

    try {
      await this.database.db.insert(favoriteListItems).values({
        favoriteListId: listId,
        productVariantId: input.productVariantId
      });
    } catch (error) {
      throw mapFavoriteListItemWriteError(error);
    }

    return mapFavoriteListItem(await this.getFavoriteListItemRow(listId, input.productVariantId));
  }

  async removeItem(listId: string, productVariantId: string, user: AuthUser): Promise<void> {
    await this.ensureOwnedList(listId, user.id);

    const [item] = await this.database.db
      .delete(favoriteListItems)
      .where(
        and(
          eq(favoriteListItems.favoriteListId, listId),
          eq(favoriteListItems.productVariantId, productVariantId)
        )
      )
      .returning({
        productVariantId: favoriteListItems.productVariantId
      });

    if (!item) {
      throw new NotFoundException("Favorite list item not found.");
    }
  }

  private async ensureOwnedList(id: string, userId: string): Promise<void> {
    await this.getOwnedListRow(id, userId);
  }

  private async getOwnedListRow(id: string, userId: string): Promise<FavoriteListRow> {
    const rows = await this.database.db
      .select({
        id: favoriteLists.id,
        name: favoriteLists.name,
        visibility: favoriteLists.visibility,
        createdAt: favoriteLists.createdAt,
        updatedAt: favoriteLists.updatedAt
      })
      .from(favoriteLists)
      .where(and(eq(favoriteLists.id, id), eq(favoriteLists.userId, userId)))
      .limit(1);

    const list = rows.at(0);

    if (!list) {
      throw new NotFoundException("Favorite list not found.");
    }

    return list;
  }

  private async ensureActiveProductVariant(productVariantId: string): Promise<void> {
    const rows = await this.database.db
      .select({
        id: productVariants.id
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(productVariants.id, productVariantId),
          eq(productVariants.status, "active"),
          eq(products.status, "active")
        )
      )
      .limit(1);

    if (!rows.at(0)) {
      throw new BadRequestException("Product variant does not exist or is not active.");
    }
  }

  private async getFavoriteListItemRow(
    listId: string,
    productVariantId: string
  ): Promise<FavoriteListItemRow> {
    const rows = await this.selectItemsByListIds([listId]);
    const item = rows.get(listId)?.find((row) => row.productVariantId === productVariantId);

    if (!item) {
      throw new Error("Favorite list item write did not return a readable row.");
    }

    return item;
  }

  private async selectItemsByListIds(
    listIds: readonly string[]
  ): Promise<Map<string, FavoriteListItemRow[]>> {
    const result = new Map<string, FavoriteListItemRow[]>();

    if (listIds.length === 0) {
      return result;
    }

    const rows = await this.database.db
      .select({
        favoriteListId: favoriteListItems.favoriteListId,
        productVariantId: favoriteListItems.productVariantId,
        productId: products.id,
        productName: products.name,
        productStatus: products.status,
        color: productVariants.color,
        voltage: productVariants.voltage,
        memory: productVariants.memory,
        size: productVariants.size,
        edition: productVariants.edition,
        variantStatus: productVariants.status,
        createdAt: favoriteListItems.createdAt
      })
      .from(favoriteListItems)
      .innerJoin(productVariants, eq(favoriteListItems.productVariantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(inArray(favoriteListItems.favoriteListId, [...listIds]))
      .orderBy(asc(favoriteListItems.createdAt), asc(favoriteListItems.productVariantId));

    for (const row of rows) {
      const group = result.get(row.favoriteListId) ?? [];
      group.push(row);
      result.set(row.favoriteListId, group);
    }

    return result;
  }
}

function requireCreatedList<T>(list: T | undefined): T {
  if (!list) {
    throw new Error("Favorite list insert did not return a row.");
  }

  return list;
}

function mapFavoriteListItemWriteError(error: unknown): Error {
  if (isUniqueViolation(error)) {
    return new ConflictException("Product variant already exists in this favorite list.");
  }

  if (isForeignKeyViolation(error)) {
    return new BadRequestException("Favorite list item references an invalid record.");
  }

  return error instanceof Error ? error : new Error("Unknown favorite list item write error.");
}
