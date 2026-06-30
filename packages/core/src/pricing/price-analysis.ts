import type { Money } from "./money.js";

export type PriceSnapshot = {
  readonly finalPrice: Money;
  readonly capturedAt: Date;
};

export type PriceOpportunityConfig = {
  readonly goodPriceMarginPercent: number;
  readonly suspiciousIncreasePercent: number;
  readonly suspiciousLookbackDays: number;
};

export type PriceOpportunityLabel =
  | "historical_low"
  | "good_opportunity"
  | "regular_price"
  | "wait"
  | "insufficient_history"
  | "suspicious_discount";

export type PriceOpportunityAnalysis = {
  readonly label: PriceOpportunityLabel;
  readonly currentPrice: Money;
  readonly averagePrice: Money | null;
  readonly historicalLow: Money | null;
  readonly discountFromAveragePercent: number | null;
  readonly isHistoricalLow: boolean;
  readonly isSuspiciousDiscount: boolean;
  readonly snapshotCount: number;
};

export const defaultPriceOpportunityConfig: PriceOpportunityConfig = {
  goodPriceMarginPercent: 8,
  suspiciousIncreasePercent: 20,
  suspiciousLookbackDays: 14
};

export function analyzePriceOpportunity(
  currentPrice: Money,
  snapshots: readonly PriceSnapshot[],
  now: Date,
  config: PriceOpportunityConfig = defaultPriceOpportunityConfig
): PriceOpportunityAnalysis {
  assertConfig(config);
  assertSnapshotsShareCurrency(currentPrice, snapshots);

  if (snapshots.length === 0) {
    return {
      label: "insufficient_history",
      currentPrice,
      averagePrice: null,
      historicalLow: null,
      discountFromAveragePercent: null,
      isHistoricalLow: false,
      isSuspiciousDiscount: false,
      snapshotCount: 0
    };
  }

  const averagePrice = calculateAveragePrice(snapshots);
  const historicalLow = calculateHistoricalLow(snapshots);
  const discountFromAveragePercent = calculateDiscountPercent(
    averagePrice.amountCents,
    currentPrice.amountCents
  );
  const isHistoricalLow = currentPrice.amountCents <= historicalLow.amountCents;
  const isSuspiciousDiscount = detectSuspiciousDiscount(currentPrice, snapshots, now, config);

  return {
    label: chooseLabel({
      discountFromAveragePercent,
      isHistoricalLow,
      isSuspiciousDiscount,
      goodPriceMarginPercent: config.goodPriceMarginPercent
    }),
    currentPrice,
    averagePrice,
    historicalLow,
    discountFromAveragePercent,
    isHistoricalLow,
    isSuspiciousDiscount,
    snapshotCount: snapshots.length
  };
}

export function calculateAveragePrice(snapshots: readonly PriceSnapshot[]): Money {
  if (snapshots.length === 0) {
    throw new Error("Cannot calculate average price without snapshots.");
  }

  const firstSnapshot = requireFirstSnapshot(snapshots);
  const total = snapshots.reduce((sum, snapshot) => sum + snapshot.finalPrice.amountCents, 0);

  return {
    amountCents: Math.round(total / snapshots.length),
    currency: firstSnapshot.finalPrice.currency
  };
}

export function calculateHistoricalLow(snapshots: readonly PriceSnapshot[]): Money {
  if (snapshots.length === 0) {
    throw new Error("Cannot calculate historical low without snapshots.");
  }

  const firstSnapshot = requireFirstSnapshot(snapshots);

  return snapshots.reduce((lowest, snapshot) => {
    if (snapshot.finalPrice.amountCents < lowest.amountCents) {
      return snapshot.finalPrice;
    }

    return lowest;
  }, firstSnapshot.finalPrice);
}

export function detectSuspiciousDiscount(
  currentPrice: Money,
  snapshots: readonly PriceSnapshot[],
  now: Date,
  config: PriceOpportunityConfig = defaultPriceOpportunityConfig
): boolean {
  assertConfig(config);
  assertSnapshotsShareCurrency(currentPrice, snapshots);

  if (snapshots.length < 2) {
    return false;
  }

  const lookbackStart = new Date(now.getTime() - daysToMilliseconds(config.suspiciousLookbackDays));

  const recentSnapshots = snapshots
    .filter((snapshot) => snapshot.capturedAt >= lookbackStart && snapshot.capturedAt <= now)
    .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());

  if (recentSnapshots.length < 2) {
    return false;
  }

  const firstPrice = requireFirstSnapshot(recentSnapshots).finalPrice.amountCents;
  const highestRecentPrice = Math.max(
    ...recentSnapshots.map((snapshot) => snapshot.finalPrice.amountCents)
  );

  if (firstPrice === 0) {
    return false;
  }

  const increasePercent = ((highestRecentPrice - firstPrice) / firstPrice) * 100;
  const discountFromHighestPercent = calculateDiscountPercent(
    highestRecentPrice,
    currentPrice.amountCents
  );

  return (
    increasePercent >= config.suspiciousIncreasePercent &&
    discountFromHighestPercent >= config.goodPriceMarginPercent
  );
}

function chooseLabel(input: {
  readonly discountFromAveragePercent: number;
  readonly isHistoricalLow: boolean;
  readonly isSuspiciousDiscount: boolean;
  readonly goodPriceMarginPercent: number;
}): PriceOpportunityLabel {
  if (input.isSuspiciousDiscount) {
    return "suspicious_discount";
  }

  if (input.isHistoricalLow) {
    return "historical_low";
  }

  if (input.discountFromAveragePercent >= input.goodPriceMarginPercent) {
    return "good_opportunity";
  }

  if (input.discountFromAveragePercent < 0) {
    return "wait";
  }

  return "regular_price";
}

function calculateDiscountPercent(
  referenceAmountCents: number,
  currentAmountCents: number
): number {
  if (referenceAmountCents === 0) {
    return 0;
  }

  return Number(
    (((referenceAmountCents - currentAmountCents) / referenceAmountCents) * 100).toFixed(2)
  );
}

function daysToMilliseconds(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function assertSnapshotsShareCurrency(
  currentPrice: Money,
  snapshots: readonly PriceSnapshot[]
): void {
  for (const snapshot of snapshots) {
    if (snapshot.finalPrice.currency !== currentPrice.currency) {
      throw new Error("All price snapshots must use the same currency as currentPrice.");
    }
  }
}

function requireFirstSnapshot(snapshots: readonly PriceSnapshot[]): PriceSnapshot {
  const firstSnapshot = snapshots.at(0);

  if (!firstSnapshot) {
    throw new Error("At least one price snapshot is required.");
  }

  return firstSnapshot;
}

function assertConfig(config: PriceOpportunityConfig): void {
  if (config.goodPriceMarginPercent < 0) {
    throw new Error("goodPriceMarginPercent cannot be negative.");
  }

  if (config.suspiciousIncreasePercent < 0) {
    throw new Error("suspiciousIncreasePercent cannot be negative.");
  }

  if (!Number.isInteger(config.suspiciousLookbackDays) || config.suspiciousLookbackDays < 1) {
    throw new Error("suspiciousLookbackDays must be a positive integer.");
  }
}
