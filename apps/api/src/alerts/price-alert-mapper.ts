import type {
  CurrencyCode,
  PriceAlertResponse,
  PriceAlertStatus,
  PriceAlertType
} from "@dealtrust/contracts";

export type PriceAlertRow = {
  readonly id: string;
  readonly productVariantId: string;
  readonly type: PriceAlertType;
  readonly targetPriceCents: number | null;
  readonly dropPercent: number | null;
  readonly currency: string;
  readonly status: PriceAlertStatus;
  readonly lastTriggeredAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export function mapPriceAlert(row: PriceAlertRow): PriceAlertResponse {
  const currency = normalizeCurrency(row.currency);

  return {
    id: row.id,
    productVariantId: row.productVariantId,
    type: row.type,
    targetPrice:
      row.targetPriceCents === null
        ? null
        : {
            amountCents: row.targetPriceCents,
            currency
          },
    dropPercent: row.dropPercent,
    status: row.status,
    lastTriggeredAt: row.lastTriggeredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function normalizeCurrency(currency: string): CurrencyCode {
  if (currency !== "BRL") {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return currency;
}
