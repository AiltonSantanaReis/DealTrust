import type {
  AdminStoreListQuery,
  AdminStoreListResponse,
  AdminStoreResponse,
  CreateAdminStoreRequest,
  StoreStatus,
  StoreType,
  UpdateAdminStoreRequest
} from "@dealtrust/contracts";
import { stores } from "@dealtrust/db";
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
import { isCheckViolation, isUniqueViolation } from "../database/postgres-errors.js";
import { mapStore } from "./store-mapper.js";

type StoreUpdateValues = {
  name?: string;
  domain?: string;
  reputationScore?: number;
  status?: StoreStatus;
  type?: StoreType;
  updatedAt: Date;
};

@Injectable()
export class StoresService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async create(
    input: CreateAdminStoreRequest,
    context: AdminActionContext
  ): Promise<AdminStoreResponse> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const [store] = await tx
          .insert(stores)
          .values({
            name: input.name,
            domain: input.domain,
            reputationScore: input.reputationScore,
            status: input.status,
            type: input.type
          })
          .returning();

        const response = mapStore(requireStore(store));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "create",
          entityType: "store",
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

  async list(query: AdminStoreListQuery): Promise<AdminStoreListResponse> {
    const filters = [
      query.status ? eq(stores.status, query.status) : undefined,
      query.type ? eq(stores.type, query.type) : undefined,
      query.q ? ilike(stores.name, `%${query.q}%`) : undefined
    ].filter((filter) => filter !== undefined);

    const rows = await this.database.db
      .select()
      .from(stores)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(stores.name), asc(stores.id))
      .limit(query.limit);

    return {
      items: rows.map(mapStore)
    };
  }

  async getById(id: string): Promise<AdminStoreResponse> {
    return mapStore(await this.getStoreRowById(id));
  }

  async update(
    id: string,
    input: UpdateAdminStoreRequest,
    context: AdminActionContext
  ): Promise<AdminStoreResponse> {
    const values: StoreUpdateValues = {
      updatedAt: new Date()
    };

    if (input.name !== undefined) {
      values.name = input.name;
    }

    if (input.domain !== undefined) {
      values.domain = input.domain;
    }

    if (input.reputationScore !== undefined) {
      values.reputationScore = input.reputationScore;
    }

    if (input.status !== undefined) {
      values.status = input.status;
    }

    if (input.type !== undefined) {
      values.type = input.type;
    }

    try {
      return await this.database.db.transaction(async (tx) => {
        const beforeRows = await tx.select().from(stores).where(eq(stores.id, id)).limit(1);
        const before = mapStore(requireFoundStore(beforeRows.at(0)));
        const [store] = await tx.update(stores).set(values).where(eq(stores.id, id)).returning();

        const response = mapStore(requireFoundStore(store));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "update",
          entityType: "store",
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
      const beforeRows = await tx.select().from(stores).where(eq(stores.id, id)).limit(1);
      const before = mapStore(requireFoundStore(beforeRows.at(0)));
      const [store] = await tx
        .update(stores)
        .set({
          status: "archived",
          updatedAt: new Date()
        })
        .where(eq(stores.id, id))
        .returning();

      const after = mapStore(requireFoundStore(store));
      await this.adminAuditService.recordWithExecutor(tx, {
        actor: context.actor,
        action: "delete",
        entityType: "store",
        entityId: after.id,
        request: context.request,
        before,
        after
      });
    });
  }

  private async getStoreRowById(id: string) {
    const rows = await this.database.db.select().from(stores).where(eq(stores.id, id)).limit(1);

    return requireFoundStore(rows.at(0));
  }
}

function requireStore<T>(store: T | undefined): T {
  if (!store) {
    throw new Error("Store write did not return a row.");
  }

  return store;
}

function requireFoundStore<T>(store: T | undefined): T {
  if (!store) {
    throw new NotFoundException("Store not found.");
  }

  return store;
}

function mapWriteError(error: unknown): Error {
  if (isUniqueViolation(error)) {
    return new ConflictException("Store domain already exists.");
  }

  if (isCheckViolation(error)) {
    return new BadRequestException("Store reputation score is outside the allowed range.");
  }

  return error instanceof Error ? error : new Error("Unknown store write error.");
}
