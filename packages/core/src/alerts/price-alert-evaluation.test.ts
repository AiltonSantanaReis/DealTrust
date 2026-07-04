import { describe, expect, it } from "vitest";
import { evaluatePriceAlert } from "./price-alert-evaluation.js";

describe("price alert evaluation", () => {
  it("triggers target price alerts when current price reaches the target", () => {
    expect(
      evaluatePriceAlert({
        type: "target_price",
        currentPriceCents: 149_90,
        targetPriceCents: 150_00,
        dropPercent: null,
        historicalFinalPricesCents: []
      })
    ).toMatchObject({
      triggered: true,
      reason: "target_price_reached",
      referencePriceCents: 150_00
    });
  });

  it("triggers drop percent alerts against historical average", () => {
    expect(
      evaluatePriceAlert({
        type: "drop_percent",
        currentPriceCents: 150_00,
        targetPriceCents: null,
        dropPercent: 25,
        historicalFinalPricesCents: [200_00, 220_00]
      })
    ).toMatchObject({
      triggered: true,
      reason: "drop_percent_reached",
      referencePriceCents: 210_00,
      thresholdPriceCents: 157_50
    });
  });

  it("triggers historical low alerts when current price reaches the lowest known price", () => {
    expect(
      evaluatePriceAlert({
        type: "historical_low",
        currentPriceCents: 189_90,
        targetPriceCents: null,
        dropPercent: null,
        historicalFinalPricesCents: [249_90, 199_90]
      })
    ).toMatchObject({
      triggered: true,
      reason: "historical_low_reached",
      referencePriceCents: 199_90
    });
  });

  it("does not trigger history-based alerts without historical data", () => {
    expect(
      evaluatePriceAlert({
        type: "historical_low",
        currentPriceCents: 189_90,
        targetPriceCents: null,
        dropPercent: null,
        historicalFinalPricesCents: []
      })
    ).toMatchObject({
      triggered: false,
      reason: "insufficient_history"
    });
  });
});
