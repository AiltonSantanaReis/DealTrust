import type { AdminProductResponse, ProductStatus } from "@dealtrust/contracts";

export type ProductRow = {
  readonly id: string;
  readonly categoryId: string;
  readonly brandId: string;
  readonly name: string;
  readonly model: string | null;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly status: ProductStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export function mapProduct(row: ProductRow): AdminProductResponse {
  return {
    id: row.id,
    categoryId: row.categoryId,
    brandId: row.brandId,
    name: row.name,
    model: row.model,
    description: row.description,
    imageUrl: row.imageUrl,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
