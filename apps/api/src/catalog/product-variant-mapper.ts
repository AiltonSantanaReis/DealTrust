import type { AdminProductVariantResponse, ProductStatus } from "@dealtrust/contracts";

export type ProductVariantRow = {
  readonly id: string;
  readonly productId: string;
  readonly color: string | null;
  readonly voltage: string | null;
  readonly memory: string | null;
  readonly size: string | null;
  readonly edition: string | null;
  readonly status: ProductStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export function mapProductVariant(row: ProductVariantRow): AdminProductVariantResponse {
  return {
    id: row.id,
    productId: row.productId,
    color: row.color,
    voltage: row.voltage,
    memory: row.memory,
    size: row.size,
    edition: row.edition,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
