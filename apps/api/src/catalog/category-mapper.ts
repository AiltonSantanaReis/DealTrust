import type { CatalogStatus, CategoryResponse } from "@dealtrust/contracts";

export type CategoryRow = {
  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly slug: string;
  readonly status: CatalogStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export function mapCategory(row: CategoryRow): CategoryResponse {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    slug: row.slug,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
