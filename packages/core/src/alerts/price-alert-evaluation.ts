export type PriceAlertKind = "target_price" | "drop_percent" | "historical_low";

export type PriceAlertEvaluationReason =
  | "target_price_reached"
  | "drop_percent_reached"
  | "historical_low_reached"
  | "missing_current_price"
  | "missing_target_price"
  | "missing_drop_percent"
  | "insufficient_history"
  | "not_triggered";

export type PriceAlertEvaluationInput = {
  readonly type: PriceAlertKind;
  readonly currentPriceCents: number | null;
  readonly targetPriceCents: number | null;
  readonly dropPercent: number | null;
  readonly historicalFinalPricesCents: readonly number[];
};

export type PriceAlertEvaluationResult = {
  readonly triggered: boolean;
  readonly reason: PriceAlertEvaluationReason;
  readonly currentPriceCents: number | null;
  readonly referencePriceCents: number | null;
  readonly thresholdPriceCents: number | null;
};

export function evaluatePriceAlert(input: PriceAlertEvaluationInput): PriceAlertEvaluationResult {
  assertValidPriceOrNull(input.currentPriceCents, "currentPriceCents");
  assertValidPriceOrNull(input.targetPriceCents, "targetPriceCents");

  for (const price of input.historicalFinalPricesCents) {
    assertValidPrice(price, "historicalFinalPricesCents");
  }

  if (input.currentPriceCents === null) {
    return buildResult(false, "missing_current_price", null, null, null);
  }

  if (input.type === "target_price") {
    return evaluateTargetPriceAlert(input.currentPriceCents, input.targetPriceCents);
  }

  if (input.type === "drop_percent") {
    return evaluateDropPercentAlert(
      input.currentPriceCents,
      input.dropPercent,
      input.historicalFinalPricesCents
    );
  }

  return evaluateHistoricalLowAlert(input.currentPriceCents, input.historicalFinalPricesCents);
}

function evaluateTargetPriceAlert(
  currentPriceCents: number,
  targetPriceCents: number | null
): PriceAlertEvaluationResult {
  if (targetPriceCents === null) {
    return buildResult(false, "missing_target_price", currentPriceCents, null, null);
  }

  return buildResult(
    currentPriceCents <= targetPriceCents,
    currentPriceCents <= targetPriceCents ? "target_price_reached" : "not_triggered",
    currentPriceCents,
    targetPriceCents,
    targetPriceCents
  );
}

function evaluateDropPercentAlert(
  currentPriceCents: number,
  dropPercent: number | null,
  historicalFinalPricesCents: readonly number[]
): PriceAlertEvaluationResult {
  if (dropPercent === null) {
    return buildResult(false, "missing_drop_percent", currentPriceCents, null, null);
  }

  assertValidDropPercent(dropPercent);

  if (historicalFinalPricesCents.length === 0) {
    return buildResult(false, "insufficient_history", currentPriceCents, null, null);
  }

  const referencePriceCents = Math.round(
    historicalFinalPricesCents.reduce((sum, price) => sum + price, 0) /
      historicalFinalPricesCents.length
  );
  const thresholdPriceCents = Math.floor((referencePriceCents * (100 - dropPercent)) / 100);
  const triggered = currentPriceCents <= thresholdPriceCents;

  return buildResult(
    triggered,
    triggered ? "drop_percent_reached" : "not_triggered",
    currentPriceCents,
    referencePriceCents,
    thresholdPriceCents
  );
}

function evaluateHistoricalLowAlert(
  currentPriceCents: number,
  historicalFinalPricesCents: readonly number[]
): PriceAlertEvaluationResult {
  if (historicalFinalPricesCents.length === 0) {
    return buildResult(false, "insufficient_history", currentPriceCents, null, null);
  }

  const historicalLowCents = Math.min(...historicalFinalPricesCents);
  const triggered = currentPriceCents <= historicalLowCents;

  return buildResult(
    triggered,
    triggered ? "historical_low_reached" : "not_triggered",
    currentPriceCents,
    historicalLowCents,
    historicalLowCents
  );
}

function buildResult(
  triggered: boolean,
  reason: PriceAlertEvaluationReason,
  currentPriceCents: number | null,
  referencePriceCents: number | null,
  thresholdPriceCents: number | null
): PriceAlertEvaluationResult {
  return {
    triggered,
    reason,
    currentPriceCents,
    referencePriceCents,
    thresholdPriceCents
  };
}

function assertValidPriceOrNull(value: number | null, fieldName: string): void {
  if (value !== null) {
    assertValidPrice(value, fieldName);
  }
}

function assertValidPrice(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
}

function assertValidDropPercent(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 90) {
    throw new Error("dropPercent must be an integer between 1 and 90.");
  }
}
