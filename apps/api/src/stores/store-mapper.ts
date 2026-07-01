import type { AdminStoreResponse, StoreStatus, StoreType } from "@dealtrust/contracts";

export type StoreRow = {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly reputationScore: number;
  readonly status: StoreStatus;
  readonly type: StoreType;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export function mapStore(row: StoreRow): AdminStoreResponse {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    reputationScore: row.reputationScore,
    status: row.status,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
