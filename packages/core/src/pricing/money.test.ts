import { describe, expect, it } from "vitest";
import { calculateFinalPrice, createMoney } from "./money.js";

describe("createMoney", () => {
  it("rejects fractional cents", () => {
    expect(() => createMoney(10.5)).toThrow("Money amount must be an integer number of cents.");
  });

  it("rejects negative amounts", () => {
    expect(() => createMoney(-1)).toThrow("Money amount cannot be negative.");
  });
});

describe("calculateFinalPrice", () => {
  it("adds shipping and subtracts confirmed discounts", () => {
    const finalPrice = calculateFinalPrice({
      productPrice: createMoney(100_00),
      shipping: createMoney(15_00),
      couponDiscount: createMoney(10_00),
      confirmedCashback: createMoney(5_00)
    });

    expect(finalPrice).toEqual(createMoney(100_00));
  });

  it("does not allow final price below zero", () => {
    const finalPrice = calculateFinalPrice({
      productPrice: createMoney(50_00),
      couponDiscount: createMoney(60_00)
    });

    expect(finalPrice).toEqual(createMoney(0));
  });
});

