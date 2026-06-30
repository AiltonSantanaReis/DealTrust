import { z } from "zod";

export const publicIdSchema = z.string().uuid();

export const currencyCodeSchema = z.enum(["BRL"]);

export const moneySchema = z.object({
  amountCents: z.number().int().nonnegative(),
  currency: currencyCodeSchema
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().min(1).optional()
});

export type PublicId = z.infer<typeof publicIdSchema>;
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;
export type MoneyDto = z.infer<typeof moneySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
