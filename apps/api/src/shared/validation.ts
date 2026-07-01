import { BadRequestException } from "@nestjs/common";
import type { ZodType } from "zod";

export function parseRequestBody<T>(schema: ZodType<T>, body: unknown): T {
  return parseRequestValue(schema, body, "Invalid request body.");
}

export function parseRequestQuery<T>(schema: ZodType<T>, query: unknown): T {
  return parseRequestValue(schema, query, "Invalid request query.");
}

export function parseRouteParam<T>(schema: ZodType<T>, value: unknown): T {
  return parseRequestValue(schema, value, "Invalid route parameter.");
}

function parseRequestValue<T>(schema: ZodType<T>, value: unknown, message: string): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException({
      message,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join(".") : "body",
        message: issue.message
      }))
    });
  }

  return result.data;
}
