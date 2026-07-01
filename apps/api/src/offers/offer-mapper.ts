import type { AdminOfferResponse, CurrencyCode, OfferStatus } from "@dealtrust/contracts";

export type OfferRow = {
  readonly id: string;
  readonly productVariantId: string;
  readonly storeId: string;
  readonly dataSourceId: string | null;
  readonly url: string;
  readonly currentPriceCents: number;
  readonly shippingCents: number;
  readonly currency: string;
  readonly inStock: boolean;
  readonly status: OfferStatus;
  readonly lastSeenAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export function mapOffer(row: OfferRow): AdminOfferResponse {
  const currency = normalizeCurrency(row.currency);

  return {
    id: row.id,
    productVariantId: row.productVariantId,
    storeId: row.storeId,
    dataSourceId: row.dataSourceId,
    url: row.url,
    currentPrice: {
      amountCents: row.currentPriceCents,
      currency
    },
    shipping: {
      amountCents: row.shippingCents,
      currency
    },
    inStock: row.inStock,
    status: row.status,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
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
