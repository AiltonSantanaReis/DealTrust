import { describe, expect, it } from "vitest";
import { createPriceAlertRequestSchema } from "./alerts.js";
import { adminAuditLogListQuerySchema } from "./audit.js";
import { authSessionSchema, loginRequestSchema, registerRequestSchema } from "./auth.js";
import {
  brandListQuerySchema,
  categoryListQuerySchema,
  createBrandRequestSchema,
  createCategoryRequestSchema,
  updateBrandRequestSchema,
  updateCategoryRequestSchema
} from "./catalog.js";
import { moneySchema } from "./common.js";
import {
  adminOfferListQuerySchema,
  createAdminOfferRequestSchema,
  createAdminPriceSnapshotRequestSchema,
  createOfferRequestSchema,
  updateAdminOfferRequestSchema
} from "./offers.js";
import {
  adminProductListQuerySchema,
  adminProductVariantListQuerySchema,
  createAdminProductRequestSchema,
  createAdminProductVariantRequestSchema,
  productSearchQuerySchema,
  updateAdminProductRequestSchema,
  updateAdminProductVariantRequestSchema
} from "./products.js";
import {
  adminStoreListQuerySchema,
  createAdminStoreRequestSchema,
  updateAdminStoreRequestSchema
} from "./stores.js";

const productVariantId = "53cf458e-8c72-48f4-bcd4-9b4a8d649c7c";
const storeId = "2f93c130-e845-47db-9472-6d5c1ac6f9ab";
const productId = "c37d891d-90ce-4d39-88d6-0e898ac2eb1e";

describe("auth contracts", () => {
  it("normalizes registration email and name", () => {
    const parsed = registerRequestSchema.parse({
      name: "  Example User  ",
      email: "  USER@EXAMPLE.COM ",
      password: "ValidTestPassword123!"
    });

    expect(parsed).toEqual({
      name: "Example User",
      email: "user@example.com",
      password: "ValidTestPassword123!"
    });
  });

  it("rejects short login passwords", () => {
    expect(() =>
      loginRequestSchema.parse({
        email: "user@example.com",
        password: "short"
      })
    ).toThrow();
  });

  it("accepts auth session responses", () => {
    const parsed = authSessionSchema.parse({
      accessToken:
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI1M2NmNDU4ZS04YzcyLTQ4ZjQtYmNkNC05YjRhOGQ2NDljN2MifQ.signature",
      tokenType: "Bearer",
      expiresInSeconds: 900,
      user: {
        id: "53cf458e-8c72-48f4-bcd4-9b4a8d649c7c",
        name: "Example User",
        email: "user@example.com",
        role: "user"
      }
    });

    expect(parsed.tokenType).toBe("Bearer");
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

describe("catalog contracts", () => {
  it("defaults new categories to active status", () => {
    const parsed = createCategoryRequestSchema.parse({
      name: "Video Games",
      slug: "video-games"
    });

    expect(parsed).toEqual({
      name: "Video Games",
      slug: "video-games",
      status: "active"
    });
  });

  it("rejects category updates without fields", () => {
    expect(() => updateCategoryRequestSchema.parse({})).toThrow();
  });

  it("coerces category list limits", () => {
    const parsed = categoryListQuerySchema.parse({
      limit: "50",
      status: "active"
    });

    expect(parsed.limit).toBe(50);
    expect(parsed.status).toBe("active");
  });

  it("accepts brand payloads and trims names", () => {
    const parsed = createBrandRequestSchema.parse({
      name: "  Sony  ",
      slug: "sony"
    });

    expect(parsed).toEqual({
      name: "Sony",
      slug: "sony"
    });
  });

  it("rejects brand updates without fields", () => {
    expect(() => updateBrandRequestSchema.parse({})).toThrow();
  });

  it("coerces brand list limits", () => {
    const parsed = brandListQuerySchema.parse({
      limit: "25",
      q: "sony"
    });

    expect(parsed.limit).toBe(25);
    expect(parsed.q).toBe("sony");
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

  it("accepts admin offer payloads and defaults stock state", () => {
    const parsed = createAdminOfferRequestSchema.parse({
      productVariantId,
      storeId,
      url: "https://example.com/produto/123",
      currentPrice: { amountCents: 299_90, currency: "BRL" }
    });

    expect(parsed.inStock).toBe(true);
    expect(parsed.status).toBe("active");
  });

  it("rejects admin offer updates without fields", () => {
    expect(() => updateAdminOfferRequestSchema.parse({})).toThrow();
  });

  it("accepts admin offer filters", () => {
    const parsed = adminOfferListQuerySchema.parse({
      limit: "10",
      productVariantId,
      status: "active"
    });

    expect(parsed.limit).toBe(10);
    expect(parsed.productVariantId).toBe(productVariantId);
  });

  it("accepts manual price snapshots with optional commercial adjustments", () => {
    const parsed = createAdminPriceSnapshotRequestSchema.parse({
      offerId: "d37d891d-90ce-4d39-88d6-0e898ac2eb1e",
      price: { amountCents: 259_90, currency: "BRL" },
      available: true,
      capturedAt: "2026-01-01T10:00:00.000Z",
      couponDiscount: { amountCents: 10_00, currency: "BRL" }
    });

    expect(parsed.capturedAt).toBeInstanceOf(Date);
    expect(parsed.couponDiscount?.amountCents).toBe(10_00);
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

  it("defaults admin products to draft status", () => {
    const parsed = createAdminProductRequestSchema.parse({
      categoryId: "53cf458e-8c72-48f4-bcd4-9b4a8d649c7c",
      brandId: "2f93c130-e845-47db-9472-6d5c1ac6f9ab",
      name: "Demo Console Pro"
    });

    expect(parsed.status).toBe("draft");
  });

  it("rejects admin product updates without fields", () => {
    expect(() => updateAdminProductRequestSchema.parse({})).toThrow();
  });

  it("accepts admin product filters", () => {
    const parsed = adminProductListQuerySchema.parse({
      limit: "25",
      status: "draft",
      categoryId: "53cf458e-8c72-48f4-bcd4-9b4a8d649c7c"
    });

    expect(parsed.limit).toBe(25);
    expect(parsed.status).toBe("draft");
  });

  it("defaults admin product variants to active status", () => {
    const parsed = createAdminProductVariantRequestSchema.parse({
      productId,
      color: "Black"
    });

    expect(parsed.status).toBe("active");
  });

  it("rejects admin product variant updates without fields", () => {
    expect(() => updateAdminProductVariantRequestSchema.parse({})).toThrow();
  });

  it("accepts admin product variant filters", () => {
    const parsed = adminProductVariantListQuerySchema.parse({
      limit: "15",
      productId,
      status: "active"
    });

    expect(parsed.limit).toBe(15);
    expect(parsed.productId).toBe(productId);
  });
});

describe("store contracts", () => {
  it("normalizes store domains and defaults review state", () => {
    const parsed = createAdminStoreRequestSchema.parse({
      name: "  Example Store  ",
      domain: "  SHOP.EXAMPLE.COM "
    });

    expect(parsed).toEqual({
      name: "Example Store",
      domain: "shop.example.com",
      reputationScore: 0,
      status: "pending_review",
      type: "retailer"
    });
  });

  it("rejects store updates without fields", () => {
    expect(() => updateAdminStoreRequestSchema.parse({})).toThrow();
  });

  it("accepts store filters", () => {
    const parsed = adminStoreListQuerySchema.parse({
      limit: "30",
      status: "active",
      type: "marketplace"
    });

    expect(parsed.limit).toBe(30);
    expect(parsed.status).toBe("active");
  });
});

describe("audit contracts", () => {
  it("accepts admin audit filters", () => {
    const parsed = adminAuditLogListQuerySchema.parse({
      limit: "50",
      action: "update",
      entityType: "offer",
      entityId: productVariantId
    });

    expect(parsed.limit).toBe(50);
    expect(parsed.action).toBe("update");
  });
});
