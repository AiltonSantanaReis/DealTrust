import type {
  AdminOfferListQuery,
  AdminOfferListResponse,
  AdminOfferResponse,
  CreateAdminOfferRequest,
  CurrencyCode,
  OfferStatus,
  UpdateAdminOfferRequest
} from "@dealtrust/contracts";
import { offers } from "@dealtrust/db";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { type AdminActionContext, AdminAuditService } from "../audit/admin-audit.service.js";
import { DatabaseService } from "../database/database.service.js";
import { isCheckViolation, isForeignKeyViolation } from "../database/postgres-errors.js";
import { mapOffer } from "./offer-mapper.js";

type OfferUpdateValues = {
  productVariantId?: string;
  storeId?: string;
  dataSourceId?: string | null;
  url?: string;
  currentPriceCents?: number;
  shippingCents?: number;
  currency?: CurrencyCode;
  inStock?: boolean;
  status?: OfferStatus;
  lastSeenAt?: Date | null;
  updatedAt: Date;
};

@Injectable()
export class OffersService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async create(
    input: CreateAdminOfferRequest,
    context: AdminActionContext
  ): Promise<AdminOfferResponse> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const [offer] = await tx
          .insert(offers)
          .values({
            productVariantId: input.productVariantId,
            storeId: input.storeId,
            dataSourceId: input.dataSourceId,
            url: input.url,
            currentPriceCents: input.currentPrice.amountCents,
            shippingCents: input.shipping?.amountCents ?? 0,
            currency: input.currentPrice.currency,
            inStock: input.inStock,
            status: input.status,
            lastSeenAt: input.lastSeenAt
          })
          .returning();

        const response = mapOffer(requireOffer(offer));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "create",
          entityType: "offer",
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

  async list(query: AdminOfferListQuery): Promise<AdminOfferListResponse> {
    const filters = [
      query.productVariantId ? eq(offers.productVariantId, query.productVariantId) : undefined,
      query.storeId ? eq(offers.storeId, query.storeId) : undefined,
      query.status ? eq(offers.status, query.status) : undefined
    ].filter((filter) => filter !== undefined);

    const rows = await this.database.db
      .select()
      .from(offers)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(offers.productVariantId), asc(offers.id))
      .limit(query.limit);

    return {
      items: rows.map(mapOffer)
    };
  }

  async getById(id: string): Promise<AdminOfferResponse> {
    return mapOffer(await this.getOfferRowById(id));
  }

  async update(
    id: string,
    input: UpdateAdminOfferRequest,
    context: AdminActionContext
  ): Promise<AdminOfferResponse> {
    const values: OfferUpdateValues = {
      updatedAt: new Date()
    };

    if (input.productVariantId !== undefined) {
      values.productVariantId = input.productVariantId;
    }

    if (input.storeId !== undefined) {
      values.storeId = input.storeId;
    }

    if (input.dataSourceId !== undefined) {
      values.dataSourceId = input.dataSourceId;
    }

    if (input.url !== undefined) {
      values.url = input.url;
    }

    if (input.currentPrice !== undefined) {
      values.currentPriceCents = input.currentPrice.amountCents;
      values.currency = input.currentPrice.currency;
    }

    if (input.shipping !== undefined) {
      values.shippingCents = input.shipping.amountCents;
    }

    if (input.inStock !== undefined) {
      values.inStock = input.inStock;
    }

    if (input.status !== undefined) {
      values.status = input.status;
    }

    if (input.lastSeenAt !== undefined) {
      values.lastSeenAt = input.lastSeenAt;
    }

    try {
      return await this.database.db.transaction(async (tx) => {
        const beforeRows = await tx.select().from(offers).where(eq(offers.id, id)).limit(1);
        const before = mapOffer(requireFoundOffer(beforeRows.at(0)));
        const [offer] = await tx.update(offers).set(values).where(eq(offers.id, id)).returning();

        const response = mapOffer(requireFoundOffer(offer));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "update",
          entityType: "offer",
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

  async expire(id: string, context: AdminActionContext): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      const beforeRows = await tx.select().from(offers).where(eq(offers.id, id)).limit(1);
      const before = mapOffer(requireFoundOffer(beforeRows.at(0)));
      const [offer] = await tx
        .update(offers)
        .set({
          status: "expired",
          updatedAt: new Date()
        })
        .where(eq(offers.id, id))
        .returning();

      const after = mapOffer(requireFoundOffer(offer));
      await this.adminAuditService.recordWithExecutor(tx, {
        actor: context.actor,
        action: "delete",
        entityType: "offer",
        entityId: after.id,
        request: context.request,
        before,
        after
      });
    });
  }

  private async getOfferRowById(id: string) {
    const rows = await this.database.db.select().from(offers).where(eq(offers.id, id)).limit(1);

    return requireFoundOffer(rows.at(0));
  }
}

function requireOffer<T>(offer: T | undefined): T {
  if (!offer) {
    throw new Error("Offer write did not return a row.");
  }

  return offer;
}

function requireFoundOffer<T>(offer: T | undefined): T {
  if (!offer) {
    throw new NotFoundException("Offer not found.");
  }

  return offer;
}

function mapWriteError(error: unknown): Error {
  if (isForeignKeyViolation(error)) {
    return new BadRequestException("Product variant, store or data source does not exist.");
  }

  if (isCheckViolation(error)) {
    return new BadRequestException("Offer monetary values must be non-negative.");
  }

  return error instanceof Error ? error : new Error("Unknown offer write error.");
}
