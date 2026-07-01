import type {
  AdminPriceSnapshotListQuery,
  AdminPriceSnapshotListResponse,
  AdminPriceSnapshotResponse,
  CreateAdminPriceSnapshotRequest
} from "@dealtrust/contracts";
import { offers, priceSnapshots } from "@dealtrust/db";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { type AdminActionContext, AdminAuditService } from "../audit/admin-audit.service.js";
import { DatabaseService } from "../database/database.service.js";
import { isCheckViolation, isForeignKeyViolation } from "../database/postgres-errors.js";
import { mapOffer } from "./offer-mapper.js";
import { mapPriceSnapshot } from "./price-snapshot-mapper.js";

@Injectable()
export class PriceSnapshotsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async create(
    input: CreateAdminPriceSnapshotRequest,
    context: AdminActionContext
  ): Promise<AdminPriceSnapshotResponse> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const beforeRows = await tx
          .select()
          .from(offers)
          .where(eq(offers.id, input.offerId))
          .limit(1);
        const beforeOffer = mapOffer(requireFoundOffer(beforeRows.at(0)));
        const [snapshot] = await tx
          .insert(priceSnapshots)
          .values({
            offerId: input.offerId,
            priceCents: input.price.amountCents,
            shippingCents: input.shipping?.amountCents ?? 0,
            couponCode: input.couponCode,
            couponDiscountCents: input.couponDiscount?.amountCents ?? 0,
            confirmedCashbackCents: input.confirmedCashback?.amountCents ?? 0,
            currency: input.price.currency,
            available: input.available,
            capturedAt: input.capturedAt
          })
          .returning();

        const response = mapPriceSnapshot(requirePriceSnapshot(snapshot));
        const [offer] = await tx
          .update(offers)
          .set({
            currentPriceCents: input.price.amountCents,
            shippingCents: input.shipping?.amountCents ?? 0,
            currency: input.price.currency,
            inStock: input.available,
            status: beforeOffer.status === "blocked" ? "blocked" : nextOfferStatus(input.available),
            lastSeenAt: input.capturedAt,
            updatedAt: new Date()
          })
          .where(eq(offers.id, input.offerId))
          .returning();

        const afterOffer = mapOffer(requireFoundOffer(offer));
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "create",
          entityType: "price_snapshot",
          entityId: response.id,
          request: context.request,
          after: response
        });
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "update",
          entityType: "offer",
          entityId: afterOffer.id,
          request: context.request,
          before: beforeOffer,
          after: afterOffer
        });

        return response;
      });
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async list(query: AdminPriceSnapshotListQuery): Promise<AdminPriceSnapshotListResponse> {
    const filters = [query.offerId ? eq(priceSnapshots.offerId, query.offerId) : undefined].filter(
      (filter) => filter !== undefined
    );

    const rows = await this.database.db
      .select()
      .from(priceSnapshots)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(priceSnapshots.capturedAt), desc(priceSnapshots.id))
      .limit(query.limit);

    return {
      items: rows.map(mapPriceSnapshot)
    };
  }

  async getById(id: string): Promise<AdminPriceSnapshotResponse> {
    const rows = await this.database.db
      .select()
      .from(priceSnapshots)
      .where(eq(priceSnapshots.id, id))
      .limit(1);

    return mapPriceSnapshot(requireFoundPriceSnapshot(rows.at(0)));
  }
}

function nextOfferStatus(available: boolean) {
  return available ? "active" : "out_of_stock";
}

function requirePriceSnapshot<T>(snapshot: T | undefined): T {
  if (!snapshot) {
    throw new Error("Price snapshot write did not return a row.");
  }

  return snapshot;
}

function requireFoundPriceSnapshot<T>(snapshot: T | undefined): T {
  if (!snapshot) {
    throw new NotFoundException("Price snapshot not found.");
  }

  return snapshot;
}

function requireFoundOffer<T>(offer: T | undefined): T {
  if (!offer) {
    throw new NotFoundException("Offer not found.");
  }

  return offer;
}

function mapWriteError(error: unknown): Error {
  if (isForeignKeyViolation(error)) {
    return new BadRequestException("Offer does not exist.");
  }

  if (isCheckViolation(error)) {
    return new BadRequestException("Price snapshot monetary values must be non-negative.");
  }

  return error instanceof Error ? error : new Error("Unknown price snapshot write error.");
}
