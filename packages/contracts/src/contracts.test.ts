import { describe, expect, it } from "vitest";
import { createPriceAlertRequestSchema } from "./alerts.js";
import { loginRequestSchema, registerRequestSchema } from "./auth.js";
import { moneySchema } from "./common.js";
import { createOfferRequestSchema } from "./offers.js";
import { productSearchQuerySchema } from "./products.js";

const productVariantId = "53cf458e-8c72-48f4-bcd4-9b4a8d649c7c";
const storeId = "2f93c130-e845-47db-9472-6d5c1ac6f9ab";

describe("auth contracts", () => {
  it("normalizes registration email and name", () => {
    const parsed = registerRequestSchema.parse({
      name: "  Ailton Reis  ",
      email: "  AILTON@EXAMPLE.COM ",
      password: "correct-horse-123"
    });

    expect(parsed).toEqual({
      name: "Ailton Reis",
      email: "ailton@example.com",
      password: "correct-horse-123"
    });
  });

  it("rejects short login passwords", () => {
    expect(() =>
      loginRequestSchema.parse({
        email: "ailton@example.com",
        password: "short"
      })
    ).toThrow();
  });
});

describe("money contract", () => {
  it("accepts integer cents in BRL", () => {
    expect(moneySchema.parse({ amountCents: 199_90, currency: "BRL" })).toEqual({
      amountCents: 199_90,
      currency: "BRL"
    });
  });

  it("rejects fractional cents", () => {
    expect(() => moneySchema.parse({ amountCents: 19.9, currency: "BRL" })).toThrow();
  });
});

describe("offer contracts", () => {
  it("accepts a valid offer with active default status", () => {
    const parsed = createOfferRequestSchema.parse({
      productVariantId,
      storeId,
      url: "https://example.com/produto/123",
      price: { amountCents: 299_90, currency: "BRL" }
    });

    expect(parsed.status).toBe("active");
  });

  it("rejects invalid offer URLs", () => {
    expect(() =>
      createOfferRequestSchema.parse({
        productVariantId,
        storeId,
        url: "not-a-url",
        price: { amountCents: 299_90, currency: "BRL" }
      })
    ).toThrow();
  });
});

describe("alert contracts", () => {
  it("accepts target price alerts", () => {
    const parsed = createPriceAlertRequestSchema.parse({
      productVariantId,
      type: "target_price",
      targetPrice: { amountCents: 149_90, currency: "BRL" }
    });

    expect(parsed.type).toBe("target_price");
  });

  it("rejects drop alerts above allowed percentage", () => {
    expect(() =>
      createPriceAlertRequestSchema.parse({
        productVariantId,
        type: "drop_percent",
        dropPercent: 95
      })
    ).toThrow();
  });
});

describe("product search contract", () => {
  it("coerces pagination and defaults status", () => {
    const parsed = productSearchQuerySchema.parse({
      limit: "50",
      q: "console"
    });

    expect(parsed.limit).toBe(50);
    expect(parsed.status).toBe("active");
  });
});
