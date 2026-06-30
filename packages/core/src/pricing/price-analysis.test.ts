import { describe, expect, it } from "vitest";
import { createMoney } from "./money.js";
import {
  analyzePriceOpportunity,
  calculateAveragePrice,
  calculateHistoricalLow,
  detectSuspiciousDiscount,
  type PriceSnapshot
} from "./price-analysis.js";

describe("price analysis", () => {
  const now = new Date("2026-06-30T12:00:00.000Z");

  it("returns insufficient history when no snapshots exist", () => {
    const analysis = analyzePriceOpportunity(createMoney(100_00), [], now);

    expect(analysis.label).toBe("insufficient_history");
    expect(analysis.averagePrice).toBeNull();
    expect(analysis.historicalLow).toBeNull();
  });

  it("calculates average price using integer cents", () => {
    const average = calculateAveragePrice([
      snapshot(100_00, "2026-06-01"),
      snapshot(110_00, "2026-06-02"),
      snapshot(90_00, "2026-06-03")
    ]);

    expect(average).toEqual(createMoney(100_00));
  });

  it("finds the historical low", () => {
    const historicalLow = calculateHistoricalLow([
      snapshot(100_00, "2026-06-01"),
      snapshot(80_00, "2026-06-02"),
      snapshot(90_00, "2026-06-03")
    ]);

    expect(historicalLow).toEqual(createMoney(80_00));
  });

  it("labels current price as historical low", () => {
    const analysis = analyzePriceOpportunity(
      createMoney(79_00),
      [
        snapshot(100_00, "2026-06-01"),
        snapshot(90_00, "2026-06-10"),
        snapshot(80_00, "2026-06-20")
      ],
      now
    );

    expect(analysis.label).toBe("historical_low");
    expect(analysis.isHistoricalLow).toBe(true);
    expect(analysis.discountFromAveragePercent).toBe(12.22);
  });

  it("labels price below average margin as good opportunity", () => {
    const analysis = analyzePriceOpportunity(
      createMoney(105_00),
      [
        snapshot(100_00, "2026-06-01"),
        snapshot(120_00, "2026-06-10"),
        snapshot(130_00, "2026-06-20")
      ],
      now
    );

    expect(analysis.label).toBe("good_opportunity");
    expect(analysis.isHistoricalLow).toBe(false);
  });

  it("labels price above average as wait", () => {
    const analysis = analyzePriceOpportunity(
      createMoney(120_00),
      [
        snapshot(100_00, "2026-06-01"),
        snapshot(105_00, "2026-06-10"),
        snapshot(110_00, "2026-06-20")
      ],
      now
    );

    expect(analysis.label).toBe("wait");
    expect(analysis.discountFromAveragePercent).toBe(-14.29);
  });

  it("detects suspicious discount after recent artificial increase", () => {
    const snapshots = [
      snapshot(100_00, "2026-06-17"),
      snapshot(130_00, "2026-06-25"),
      snapshot(128_00, "2026-06-28")
    ];

    expect(detectSuspiciousDiscount(createMoney(99_00), snapshots, now)).toBe(true);

    const analysis = analyzePriceOpportunity(createMoney(99_00), snapshots, now);
    expect(analysis.label).toBe("suspicious_discount");
  });

  it("does not detect suspicious discount with old increase outside lookback", () => {
    const snapshots = [
      snapshot(100_00, "2026-05-01"),
      snapshot(130_00, "2026-05-10"),
      snapshot(99_00, "2026-06-29")
    ];

    expect(detectSuspiciousDiscount(createMoney(98_00), snapshots, now)).toBe(false);
  });
});

function snapshot(amountCents: number, date: string): PriceSnapshot {
  return {
    finalPrice: createMoney(amountCents),
    capturedAt: new Date(`${date}T12:00:00.000Z`)
  };
}
