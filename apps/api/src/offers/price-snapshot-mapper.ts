import type { AdminPriceSnapshotResponse, CurrencyCode } from "@dealtrust/contracts";

export type PriceSnapshotRow = {
  readonly id: string;
  readonly offerId: string;
  readonly priceCents: number;
  readonly shippingCents: number;
  readonly couponCode: string | null;
  readonly couponDiscountCents: number;
  readonly confirmedCashbackCents: number;
  readonly currency: string;
  readonly available: boolean;
  readonly capturedAt: Date;
};

export function mapPriceSnapshot(row: PriceSnapshotRow): AdminPriceSnapshotResponse {
  const currency = normalizeCurrency(row.currency);

  return {
    id: row.id,
    offerId: row.offerId,
    price: {
      amountCents: row.priceCents,
      currency
    },
    shipping: {
      amountCents: row.shippingCents,
      currency
    },
    couponCode: row.couponCode,
    couponDiscount: {
      amountCents: row.couponDiscountCents,
      currency
    },
    confirmedCashback: {
      amountCents: row.confirmedCashbackCents,
      currency
    },
    available: row.available,
    capturedAt: row.capturedAt.toISOString()
  };
}

function normalizeCurrency(currency: string): CurrencyCode {
  if (currency !== "BRL") {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return currency;
}
