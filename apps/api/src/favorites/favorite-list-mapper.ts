import type {
  FavoriteListItemResponse,
  FavoriteListResponse,
  FavoriteListVisibility,
  ProductStatus
} from "@dealtrust/contracts";

export type FavoriteListRow = {
  readonly id: string;
  readonly name: string;
  readonly visibility: FavoriteListVisibility;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type FavoriteListItemRow = {
  readonly favoriteListId: string;
  readonly productVariantId: string;
  readonly productId: string;
  readonly productName: string;
  readonly productStatus: ProductStatus;
  readonly color: string | null;
  readonly voltage: string | null;
  readonly memory: string | null;
  readonly size: string | null;
  readonly edition: string | null;
  readonly variantStatus: ProductStatus;
  readonly createdAt: Date;
};

export function mapFavoriteList(
  row: FavoriteListRow,
  items: readonly FavoriteListItemRow[]
): FavoriteListResponse {
  const mappedItems = items.map(mapFavoriteListItem);

  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility,
    itemCount: mappedItems.length,
    items: mappedItems,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function mapFavoriteListItem(row: FavoriteListItemRow): FavoriteListItemResponse {
  return {
    productVariantId: row.productVariantId,
    productId: row.productId,
    productName: row.productName,
    productStatus: row.productStatus,
    variant: {
      color: row.color,
      voltage: row.voltage,
      memory: row.memory,
      size: row.size,
      edition: row.edition,
      status: row.variantStatus
    },
    createdAt: row.createdAt.toISOString()
  };
}
