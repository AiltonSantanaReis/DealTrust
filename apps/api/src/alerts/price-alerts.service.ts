import type {
  AuthUser,
  CreatePriceAlertRequest,
  PriceAlertListQuery,
  PriceAlertListResponse,
  PriceAlertResponse,
  PriceAlertStatus,
  PriceAlertType,
  UpdatePriceAlertRequest
} from "@dealtrust/contracts";
import { priceAlerts, productVariants } from "@dealtrust/db";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DatabaseService } from "../database/database.service.js";
import { isCheckViolation, isForeignKeyViolation } from "../database/postgres-errors.js";
import { mapPriceAlert, type PriceAlertRow } from "./price-alert-mapper.js";

type PriceAlertInsertValues = {
  userId: string;
  productVariantId: string;
  type: PriceAlertType;
  targetPriceCents: number | null;
  dropPercent: number | null;
  currency: "BRL";
};

type PriceAlertUpdateValues = {
  status?: PriceAlertStatus;
  targetPriceCents?: number | null;
  dropPercent?: number | null;
  currency?: "BRL";
  updatedAt: Date;
};

@Injectable()
export class PriceAlertsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(input: CreatePriceAlertRequest, user: AuthUser): Promise<PriceAlertResponse> {
    await this.ensureActiveProductVariant(input.productVariantId);

    try {
      const [alert] = await this.database.db
        .insert(priceAlerts)
        .values(toInsertValues(input, user))
        .returning();

      return mapPriceAlert(requirePriceAlert(alert));
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async list(query: PriceAlertListQuery, user: AuthUser): Promise<PriceAlertListResponse> {
    const filters = [
      eq(priceAlerts.userId, user.id),
      query.status ? eq(priceAlerts.status, query.status) : undefined,
      query.productVariantId ? eq(priceAlerts.productVariantId, query.productVariantId) : undefined
    ].filter((filter) => filter !== undefined);

    const rows = await this.database.db
      .select()
      .from(priceAlerts)
      .where(and(...filters))
      .orderBy(asc(priceAlerts.createdAt), asc(priceAlerts.id))
      .limit(query.limit);

    return {
      items: rows.map(mapPriceAlert)
    };
  }

  async getById(id: string, user: AuthUser): Promise<PriceAlertResponse> {
    return mapPriceAlert(await this.getAlertRowById(id, user.id));
  }

  async update(
    id: string,
    input: UpdatePriceAlertRequest,
    user: AuthUser
  ): Promise<PriceAlertResponse> {
    const before = await this.getAlertRowById(id, user.id);
    const values = toUpdateValues(input, before);

    try {
      const [alert] = await this.database.db
        .update(priceAlerts)
        .set(values)
        .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, user.id)))
        .returning();

      return mapPriceAlert(requireFoundPriceAlert(alert));
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async cancel(id: string, user: AuthUser): Promise<void> {
    const [alert] = await this.database.db
      .update(priceAlerts)
      .set({
        status: "canceled",
        updatedAt: new Date()
      })
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, user.id)))
      .returning({ id: priceAlerts.id });

    if (!alert) {
      throw new NotFoundException("Price alert not found.");
    }
  }

  private async ensureActiveProductVariant(productVariantId: string): Promise<void> {
    const rows = await this.database.db
      .select({
        id: productVariants.id
      })
      .from(productVariants)
      .where(and(eq(productVariants.id, productVariantId), eq(productVariants.status, "active")))
      .limit(1);

    if (!rows.at(0)) {
      throw new BadRequestException("Product variant does not exist or is not active.");
    }
  }

  private async getAlertRowById(id: string, userId: string): Promise<PriceAlertRow> {
    const rows = await this.database.db
      .select()
      .from(priceAlerts)
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)))
      .limit(1);

    return requireFoundPriceAlert(rows.at(0));
  }
}

function toInsertValues(input: CreatePriceAlertRequest, user: AuthUser): PriceAlertInsertValues {
  if (input.type === "target_price") {
    return {
      userId: user.id,
      productVariantId: input.productVariantId,
      type: input.type,
      targetPriceCents: input.targetPrice.amountCents,
      dropPercent: null,
      currency: input.targetPrice.currency
    };
  }

  if (input.type === "drop_percent") {
    return {
      userId: user.id,
      productVariantId: input.productVariantId,
      type: input.type,
      targetPriceCents: null,
      dropPercent: input.dropPercent,
      currency: "BRL"
    };
  }

  return {
    userId: user.id,
    productVariantId: input.productVariantId,
    type: input.type,
    targetPriceCents: null,
    dropPercent: null,
    currency: "BRL"
  };
}

function toUpdateValues(
  input: UpdatePriceAlertRequest,
  current: PriceAlertRow
): PriceAlertUpdateValues {
  const values: PriceAlertUpdateValues = {
    updatedAt: new Date()
  };

  if (input.status !== undefined) {
    values.status = input.status;
  }

  if (input.targetPrice !== undefined) {
    if (current.type !== "target_price") {
      throw new BadRequestException("Only target price alerts can update targetPrice.");
    }

    values.targetPriceCents = input.targetPrice.amountCents;
    values.currency = input.targetPrice.currency;
  }

  if (input.dropPercent !== undefined) {
    if (current.type !== "drop_percent") {
      throw new BadRequestException("Only drop percent alerts can update dropPercent.");
    }

    values.dropPercent = input.dropPercent;
  }

  return values;
}

function requirePriceAlert<T>(alert: T | undefined): T {
  if (!alert) {
    throw new Error("Price alert write did not return a row.");
  }

  return alert;
}

function requireFoundPriceAlert<T>(alert: T | undefined): T {
  if (!alert) {
    throw new NotFoundException("Price alert not found.");
  }

  return alert;
}

function mapWriteError(error: unknown): Error {
  if (isForeignKeyViolation(error)) {
    return new BadRequestException("Product variant does not exist.");
  }

  if (isCheckViolation(error)) {
    return new BadRequestException("Price alert values are outside the allowed range.");
  }

  return error instanceof Error ? error : new Error("Unknown price alert write error.");
}
