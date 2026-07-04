import { randomUUID } from "node:crypto";
import type {
  PriceAlertType,
  PriceAlertVerificationReason,
  PriceAlertVerificationRequest,
  PriceAlertVerificationResponse,
  PriceAlertVerificationTriggeredAlert
} from "@dealtrust/contracts";
import { evaluatePriceAlert, type PriceAlertEvaluationReason } from "@dealtrust/core";
import {
  notifications,
  offers,
  priceAlerts,
  priceSnapshots,
  products,
  productVariants,
  stores,
  users
} from "@dealtrust/db";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { type AdminActionContext, AdminAuditService } from "../audit/admin-audit.service.js";
import { DatabaseService } from "../database/database.service.js";

type ActiveAlertCandidateRow = {
  readonly id: string;
  readonly userId: string;
  readonly productVariantId: string;
  readonly type: PriceAlertType;
  readonly targetPriceCents: number | null;
  readonly dropPercent: number | null;
  readonly currency: string;
  readonly productName: string;
};

type OfferRow = {
  readonly id: string;
  readonly productVariantId: string;
  readonly currentPriceCents: number;
  readonly shippingCents: number;
  readonly currency: string;
};

type SnapshotRow = {
  readonly offerId: string;
  readonly priceCents: number;
  readonly shippingCents: number;
  readonly couponDiscountCents: number;
  readonly confirmedCashbackCents: number;
  readonly currency: string;
};

type BestOffer = {
  readonly id: string;
  readonly productVariantId: string;
  readonly finalPriceCents: number;
  readonly currency: "BRL";
};

@Injectable()
export class PriceAlertVerificationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async verifyActiveAlerts(
    input: PriceAlertVerificationRequest,
    context?: AdminActionContext
  ): Promise<PriceAlertVerificationResponse> {
    const processedAt = new Date();

    return this.database.db.transaction(async (tx) => {
      const candidates = await tx
        .select({
          id: priceAlerts.id,
          userId: priceAlerts.userId,
          productVariantId: priceAlerts.productVariantId,
          type: priceAlerts.type,
          targetPriceCents: priceAlerts.targetPriceCents,
          dropPercent: priceAlerts.dropPercent,
          currency: priceAlerts.currency,
          productName: products.name
        })
        .from(priceAlerts)
        .innerJoin(users, eq(priceAlerts.userId, users.id))
        .innerJoin(productVariants, eq(priceAlerts.productVariantId, productVariants.id))
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            eq(priceAlerts.status, "active"),
            eq(users.status, "active"),
            eq(productVariants.status, "active"),
            eq(products.status, "active")
          )
        )
        .orderBy(asc(priceAlerts.createdAt), asc(priceAlerts.id))
        .limit(input.limit);

      const activeOffersByVariantId = groupOffersByVariant(
        await this.selectActiveOffers(
          candidates.map((candidate) => candidate.productVariantId),
          tx
        )
      );
      const snapshotsByVariantId = groupSnapshotsByVariant(
        await this.selectAvailableSnapshots(activeOffersByVariantId, tx),
        activeOffersByVariantId
      );
      const triggeredAlerts: PriceAlertVerificationTriggeredAlert[] = [];
      let notificationCount = 0;

      for (const candidate of candidates) {
        const bestOffer = selectBestOffer(activeOffersByVariantId.get(candidate.productVariantId));
        const historicalFinalPricesCents =
          snapshotsByVariantId.get(candidate.productVariantId) ?? [];
        const evaluation = evaluatePriceAlert({
          type: candidate.type,
          currentPriceCents: bestOffer?.finalPriceCents ?? null,
          targetPriceCents: candidate.targetPriceCents,
          dropPercent: candidate.dropPercent,
          historicalFinalPricesCents
        });

        if (!evaluation.triggered || !isTriggeredReason(evaluation.reason) || !bestOffer) {
          continue;
        }

        const [updatedAlert] = await tx
          .update(priceAlerts)
          .set({
            status: "triggered",
            lastTriggeredAt: processedAt,
            updatedAt: processedAt
          })
          .where(and(eq(priceAlerts.id, candidate.id), eq(priceAlerts.status, "active")))
          .returning({
            id: priceAlerts.id
          });

        if (!updatedAlert) {
          continue;
        }

        await tx.insert(notifications).values({
          userId: candidate.userId,
          channel: "email",
          title: buildNotificationTitle(candidate.type),
          body: buildNotificationBody(candidate, evaluation)
        });
        notificationCount += 1;
        triggeredAlerts.push(
          mapTriggeredAlert(candidate, evaluation, bestOffer.currency, evaluation.reason)
        );
      }

      const response: PriceAlertVerificationResponse = {
        scannedAlertCount: candidates.length,
        triggeredAlertCount: triggeredAlerts.length,
        notificationCount,
        skippedAlertCount: candidates.length - triggeredAlerts.length,
        processedAt: processedAt.toISOString(),
        triggeredAlerts
      };

      if (context) {
        await this.adminAuditService.recordWithExecutor(tx, {
          actor: context.actor,
          action: "update",
          entityType: "price_alert_verification",
          entityId: randomUUID(),
          request: context.request,
          after: response
        });
      }

      return response;
    });
  }

  private async selectActiveOffers(
    variantIds: readonly string[],
    executor: Pick<typeof this.database.db, "select">
  ): Promise<OfferRow[]> {
    if (variantIds.length === 0) {
      return [];
    }

    return executor
      .select({
        id: offers.id,
        productVariantId: offers.productVariantId,
        currentPriceCents: offers.currentPriceCents,
        shippingCents: offers.shippingCents,
        currency: offers.currency
      })
      .from(offers)
      .innerJoin(stores, eq(offers.storeId, stores.id))
      .where(
        and(
          inArray(offers.productVariantId, [...new Set(variantIds)]),
          eq(offers.status, "active"),
          eq(offers.inStock, true),
          eq(stores.status, "active")
        )
      );
  }

  private async selectAvailableSnapshots(
    offersByVariantId: ReadonlyMap<string, readonly OfferRow[]>,
    executor: Pick<typeof this.database.db, "select">
  ): Promise<SnapshotRow[]> {
    const offerIds = [...offersByVariantId.values()]
      .flatMap((variantOffers) => variantOffers.map((offer) => offer.id))
      .filter((offerId, index, values) => values.indexOf(offerId) === index);

    if (offerIds.length === 0) {
      return [];
    }

    return executor
      .select({
        offerId: priceSnapshots.offerId,
        priceCents: priceSnapshots.priceCents,
        shippingCents: priceSnapshots.shippingCents,
        couponDiscountCents: priceSnapshots.couponDiscountCents,
        confirmedCashbackCents: priceSnapshots.confirmedCashbackCents,
        currency: priceSnapshots.currency
      })
      .from(priceSnapshots)
      .where(and(inArray(priceSnapshots.offerId, offerIds), eq(priceSnapshots.available, true)));
  }
}

function groupOffersByVariant(rows: readonly OfferRow[]): Map<string, OfferRow[]> {
  const result = new Map<string, OfferRow[]>();

  for (const row of rows) {
    const group = result.get(row.productVariantId) ?? [];
    group.push(row);
    result.set(row.productVariantId, group);
  }

  return result;
}

function groupSnapshotsByVariant(
  rows: readonly SnapshotRow[],
  offersByVariantId: ReadonlyMap<string, readonly OfferRow[]>
): Map<string, number[]> {
  const variantIdByOfferId = new Map<string, string>();
  const result = new Map<string, number[]>();

  for (const [variantId, variantOffers] of offersByVariantId) {
    for (const offer of variantOffers) {
      variantIdByOfferId.set(offer.id, variantId);
    }
  }

  for (const row of rows) {
    const variantId = variantIdByOfferId.get(row.offerId);

    if (!variantId) {
      continue;
    }

    normalizeCurrency(row.currency);

    const prices = result.get(variantId) ?? [];
    prices.push(
      Math.max(
        0,
        row.priceCents + row.shippingCents - row.couponDiscountCents - row.confirmedCashbackCents
      )
    );
    result.set(variantId, prices);
  }

  return result;
}

function selectBestOffer(rows: readonly OfferRow[] | undefined): BestOffer | undefined {
  if (!rows || rows.length === 0) {
    return undefined;
  }

  return rows
    .map((row) => ({
      id: row.id,
      productVariantId: row.productVariantId,
      finalPriceCents: row.currentPriceCents + row.shippingCents,
      currency: normalizeCurrency(row.currency)
    }))
    .sort(
      (left, right) =>
        left.finalPriceCents - right.finalPriceCents || left.id.localeCompare(right.id)
    )
    .at(0);
}

function mapTriggeredAlert(
  candidate: ActiveAlertCandidateRow,
  evaluation: {
    readonly currentPriceCents: number | null;
    readonly referencePriceCents: number | null;
    readonly thresholdPriceCents: number | null;
  },
  currency: "BRL",
  reason: PriceAlertVerificationReason
): PriceAlertVerificationTriggeredAlert {
  if (evaluation.currentPriceCents === null) {
    throw new Error("Triggered price alert must have a current price.");
  }

  return {
    id: candidate.id,
    productVariantId: candidate.productVariantId,
    type: candidate.type,
    reason,
    currentPrice: createMoney(evaluation.currentPriceCents, currency),
    referencePrice:
      evaluation.referencePriceCents === null
        ? null
        : createMoney(evaluation.referencePriceCents, currency),
    thresholdPrice:
      evaluation.thresholdPriceCents === null
        ? null
        : createMoney(evaluation.thresholdPriceCents, currency)
  };
}

function buildNotificationTitle(type: PriceAlertType): string {
  if (type === "target_price") {
    return "Price target reached";
  }

  if (type === "drop_percent") {
    return "Price drop alert triggered";
  }

  return "Historical low alert triggered";
}

function buildNotificationBody(
  candidate: ActiveAlertCandidateRow,
  evaluation: {
    readonly currentPriceCents: number | null;
    readonly referencePriceCents: number | null;
    readonly thresholdPriceCents: number | null;
  }
): string {
  return [
    `Product: ${candidate.productName}.`,
    `Current price: ${formatBrl(evaluation.currentPriceCents)}.`,
    `Reference price: ${formatBrl(evaluation.referencePriceCents)}.`,
    `Threshold price: ${formatBrl(evaluation.thresholdPriceCents)}.`
  ].join(" ");
}

function createMoney(amountCents: number, currency: "BRL") {
  return {
    amountCents,
    currency
  };
}

function formatBrl(amountCents: number | null): string {
  if (amountCents === null) {
    return "unavailable";
  }

  return `BRL ${(amountCents / 100).toFixed(2)}`;
}

function normalizeCurrency(currency: string): "BRL" {
  if (currency !== "BRL") {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return currency;
}

function isTriggeredReason(
  reason: PriceAlertEvaluationReason
): reason is PriceAlertVerificationReason {
  return (
    reason === "target_price_reached" ||
    reason === "drop_percent_reached" ||
    reason === "historical_low_reached"
  );
}
