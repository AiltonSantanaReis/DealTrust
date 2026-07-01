import type {
  CurrencyCode,
  ProductDetailQuery,
  ProductSearchQuery,
  ProductSearchResponse,
  PublicProductDetailResponse,
  PublicProductOffer,
  PublicProductPriceSnapshot,
  PublicProductPriceWindow,
  PublicProductSummary
} from "@dealtrust/contracts";
import {
  analyzePriceOpportunity,
  type Money,
  type PriceOpportunityAnalysis,
  type PriceSnapshot
} from "@dealtrust/core";
import {
  brands,
  categories,
  offers,
  priceSnapshots,
  products,
  productVariants,
  stores
} from "@dealtrust/db";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, gte, ilike, inArray } from "drizzle-orm";
import { DatabaseService } from "../database/database.service.js";

type ProductIdentityRow = {
  readonly id: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categorySlug: string;
  readonly brandId: string;
  readonly brandName: string;
  readonly brandSlug: string;
  readonly name: string;
  readonly model: string | null;
  readonly description: string | null;
  readonly imageUrl: string | null;
};

type VariantRow = {
  readonly id: string;
  readonly productId: string;
  readonly color: string | null;
  readonly voltage: string | null;
  readonly memory: string | null;
  readonly size: string | null;
  readonly edition: string | null;
};

type OfferRow = {
  readonly id: string;
  readonly variantId: string;
  readonly storeId: string;
  readonly storeName: string;
  readonly storeDomain: string;
  readonly storeReputationScore: number;
  readonly url: string;
  readonly currentPriceCents: number;
  readonly shippingCents: number;
  readonly currency: string;
  readonly inStock: boolean;
  readonly lastSeenAt: Date | null;
};

type SnapshotRow = {
  readonly offerId: string;
  readonly priceCents: number;
  readonly shippingCents: number;
  readonly couponDiscountCents: number;
  readonly confirmedCashbackCents: number;
  readonly currency: string;
  readonly available: boolean;
  readonly capturedAt: Date;
};

const chartWindowDays = [7, 30, 90, 180] as const;
const maxChartWindowDays = 180;
const maxChartSnapshotLimit = 500;

@Injectable()
export class PublicProductsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async search(query: ProductSearchQuery): Promise<ProductSearchResponse> {
    const productRows = await this.selectProducts(query);
    const summaries = await this.buildSummaries(productRows);

    return {
      items: summaries
    };
  }

  async getById(id: string, query: ProductDetailQuery): Promise<PublicProductDetailResponse> {
    const product = await this.selectActiveProductById(id);

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    const variants = await this.selectActiveVariants([product.id]);
    const offerRows = await this.selectActiveOffers(variants.map((variant) => variant.id));
    const offerDtos = offerRows.map(mapOffer);
    const priceHistoryRows = await this.selectPriceHistory(
      offerRows.map((offer) => offer.id),
      Math.max(query.historyDays, maxChartWindowDays),
      maxChartSnapshotLimit
    );
    const allSnapshotDtos = sortSnapshotsAscending(priceHistoryRows.map(mapSnapshot));
    const snapshotDtos = allSnapshotDtos
      .filter((snapshot) => isWithinDays(snapshot.capturedAt, query.historyDays))
      .slice(-query.historyLimit);
    const summary = buildSummary(product, offerDtos);
    const priceAnalysis = buildPriceAnalysis(summary.lowestOffer, snapshotDtos);
    const priceWindows = buildPriceWindows(summary.lowestOffer, allSnapshotDtos);

    return {
      ...summary,
      description: product.description,
      variants: variants.map((variant) => ({
        id: variant.id,
        color: variant.color,
        voltage: variant.voltage,
        memory: variant.memory,
        size: variant.size,
        edition: variant.edition
      })),
      offers: offerDtos,
      priceHistory: snapshotDtos,
      priceWindows,
      priceAnalysis
    };
  }

  private async selectProducts(query: ProductSearchQuery): Promise<ProductIdentityRow[]> {
    const filters = [
      eq(products.status, "active"),
      query.categoryId ? eq(products.categoryId, query.categoryId) : undefined,
      query.brandName ? ilike(brands.name, `%${query.brandName}%`) : undefined,
      query.q ? ilike(products.name, `%${query.q}%`) : undefined
    ].filter((filter) => filter !== undefined);

    return this.database.db
      .select({
        id: products.id,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
        name: products.name,
        model: products.model,
        description: products.description,
        imageUrl: products.imageUrl
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(...filters))
      .orderBy(asc(products.name), asc(products.id))
      .limit(query.limit);
  }

  private async selectActiveProductById(id: string): Promise<ProductIdentityRow | undefined> {
    const rows = await this.database.db
      .select({
        id: products.id,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandId: brands.id,
        brandName: brands.name,
        brandSlug: brands.slug,
        name: products.name,
        model: products.model,
        description: products.description,
        imageUrl: products.imageUrl
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(eq(products.id, id), eq(products.status, "active")))
      .limit(1);

    return rows.at(0);
  }

  private async buildSummaries(
    productRows: readonly ProductIdentityRow[]
  ): Promise<PublicProductSummary[]> {
    if (productRows.length === 0) {
      return [];
    }

    const variants = await this.selectActiveVariants(productRows.map((product) => product.id));
    const offersByVariantId = groupBy(
      await this.selectActiveOffers(variants.map((variant) => variant.id)),
      (offer) => offer.variantId
    );
    const variantsByProductId = groupBy(variants, (variant) => variant.productId);

    return productRows.map((product) => {
      const productOffers = (variantsByProductId.get(product.id) ?? []).flatMap((variant) =>
        (offersByVariantId.get(variant.id) ?? []).map(mapOffer)
      );

      return buildSummary(product, productOffers);
    });
  }

  private async selectActiveVariants(productIds: readonly string[]): Promise<VariantRow[]> {
    if (productIds.length === 0) {
      return [];
    }

    return this.database.db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        color: productVariants.color,
        voltage: productVariants.voltage,
        memory: productVariants.memory,
        size: productVariants.size,
        edition: productVariants.edition
      })
      .from(productVariants)
      .where(
        and(
          inArray(productVariants.productId, [...productIds]),
          eq(productVariants.status, "active")
        )
      )
      .orderBy(asc(productVariants.id));
  }

  private async selectActiveOffers(variantIds: readonly string[]): Promise<OfferRow[]> {
    if (variantIds.length === 0) {
      return [];
    }

    return this.database.db
      .select({
        id: offers.id,
        variantId: offers.productVariantId,
        storeId: stores.id,
        storeName: stores.name,
        storeDomain: stores.domain,
        storeReputationScore: stores.reputationScore,
        url: offers.url,
        currentPriceCents: offers.currentPriceCents,
        shippingCents: offers.shippingCents,
        currency: offers.currency,
        inStock: offers.inStock,
        lastSeenAt: offers.lastSeenAt
      })
      .from(offers)
      .innerJoin(stores, eq(offers.storeId, stores.id))
      .where(
        and(
          inArray(offers.productVariantId, [...variantIds]),
          eq(offers.status, "active"),
          eq(stores.status, "active")
        )
      )
      .orderBy(asc(offers.currentPriceCents), asc(offers.shippingCents), asc(offers.id));
  }

  private async selectPriceHistory(
    offerIds: readonly string[],
    historyDays: number,
    historyLimit: number
  ): Promise<SnapshotRow[]> {
    if (offerIds.length === 0) {
      return [];
    }

    const capturedAfter = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000);

    return this.database.db
      .select({
        offerId: priceSnapshots.offerId,
        priceCents: priceSnapshots.priceCents,
        shippingCents: priceSnapshots.shippingCents,
        couponDiscountCents: priceSnapshots.couponDiscountCents,
        confirmedCashbackCents: priceSnapshots.confirmedCashbackCents,
        currency: priceSnapshots.currency,
        available: priceSnapshots.available,
        capturedAt: priceSnapshots.capturedAt
      })
      .from(priceSnapshots)
      .where(
        and(
          inArray(priceSnapshots.offerId, [...offerIds]),
          gte(priceSnapshots.capturedAt, capturedAfter)
        )
      )
      .orderBy(desc(priceSnapshots.capturedAt), desc(priceSnapshots.offerId))
      .limit(historyLimit);
  }
}

function buildSummary(
  product: ProductIdentityRow,
  offersForProduct: readonly PublicProductOffer[]
): PublicProductSummary {
  const sortedOffers = [...offersForProduct].sort(
    (left, right) => left.finalPrice.amountCents - right.finalPrice.amountCents
  );

  return {
    id: product.id,
    name: product.name,
    model: product.model,
    imageUrl: product.imageUrl,
    brand: {
      id: product.brandId,
      name: product.brandName,
      slug: product.brandSlug
    },
    category: {
      id: product.categoryId,
      name: product.categoryName,
      slug: product.categorySlug
    },
    lowestOffer: sortedOffers.at(0) ?? null,
    offerCount: offersForProduct.length,
    inStockOfferCount: offersForProduct.filter((offer) => offer.inStock).length
  };
}

function buildPriceAnalysis(
  lowestOffer: PublicProductOffer | null,
  snapshots: readonly PublicProductPriceSnapshot[]
) {
  if (!lowestOffer) {
    return {
      label: "insufficient_history" as const,
      currentPrice: null,
      averagePrice: null,
      historicalLow: null,
      discountFromAveragePercent: null,
      snapshotCount: snapshots.length
    };
  }

  const analysis = analyzePriceOpportunity(
    lowestOffer.finalPrice,
    snapshots.map(toCoreSnapshot),
    new Date()
  );

  return mapAnalysis(analysis);
}

function buildPriceWindows(
  lowestOffer: PublicProductOffer | null,
  snapshots: readonly PublicProductPriceSnapshot[]
): PublicProductPriceWindow[] {
  return chartWindowDays.map((days) => {
    const windowSnapshots = snapshots.filter((snapshot) => isWithinDays(snapshot.capturedAt, days));
    const latestSnapshot = windowSnapshots.at(-1);

    return {
      days,
      snapshotCount: windowSnapshots.length,
      latestSnapshotAt: latestSnapshot?.capturedAt ?? null,
      analysis: buildPriceAnalysis(lowestOffer, windowSnapshots)
    };
  });
}

function mapAnalysis(analysis: PriceOpportunityAnalysis) {
  return {
    label: analysis.label,
    currentPrice: analysis.currentPrice,
    averagePrice: analysis.averagePrice,
    historicalLow: analysis.historicalLow,
    discountFromAveragePercent: analysis.discountFromAveragePercent,
    snapshotCount: analysis.snapshotCount
  };
}

function mapOffer(row: OfferRow): PublicProductOffer {
  const currency = normalizeCurrency(row.currency);
  const price = createMoney(row.currentPriceCents, currency);
  const shipping = createMoney(row.shippingCents, currency);

  return {
    id: row.id,
    variantId: row.variantId,
    store: {
      id: row.storeId,
      name: row.storeName,
      domain: row.storeDomain,
      reputationScore: row.storeReputationScore
    },
    url: row.url,
    price,
    shipping,
    finalPrice: createMoney(row.currentPriceCents + row.shippingCents, currency),
    inStock: row.inStock,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null
  };
}

function mapSnapshot(row: SnapshotRow): PublicProductPriceSnapshot {
  const currency = normalizeCurrency(row.currency);
  const couponDiscount = createMoney(row.couponDiscountCents, currency);
  const confirmedCashback = createMoney(row.confirmedCashbackCents, currency);

  return {
    offerId: row.offerId,
    capturedAt: row.capturedAt.toISOString(),
    price: createMoney(row.priceCents, currency),
    shipping: createMoney(row.shippingCents, currency),
    couponDiscount,
    confirmedCashback,
    finalPrice: createMoney(
      Math.max(
        0,
        row.priceCents +
          row.shippingCents -
          couponDiscount.amountCents -
          confirmedCashback.amountCents
      ),
      currency
    ),
    available: row.available
  };
}

function toCoreSnapshot(snapshot: PublicProductPriceSnapshot): PriceSnapshot {
  return {
    finalPrice: snapshot.finalPrice,
    capturedAt: new Date(snapshot.capturedAt)
  };
}

function createMoney(amountCents: number, currency: CurrencyCode): Money {
  return {
    amountCents,
    currency
  };
}

function normalizeCurrency(currency: string): CurrencyCode {
  if (currency !== "BRL") {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return currency;
}

function sortSnapshotsAscending(
  snapshots: readonly PublicProductPriceSnapshot[]
): PublicProductPriceSnapshot[] {
  return [...snapshots].sort(
    (left, right) =>
      new Date(left.capturedAt).getTime() - new Date(right.capturedAt).getTime() ||
      left.offerId.localeCompare(right.offerId)
  );
}

function isWithinDays(capturedAt: string, days: number): boolean {
  return new Date(capturedAt).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function groupBy<T>(
  values: readonly T[],
  keySelector: (value: T) => string
): Map<string, readonly T[]> {
  const result = new Map<string, T[]>();

  for (const value of values) {
    const key = keySelector(value);
    const group = result.get(key) ?? [];
    group.push(value);
    result.set(key, group);
  }

  return result;
}
