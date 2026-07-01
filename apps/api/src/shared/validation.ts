import { BadRequestException } from "@nestjs/common";
import type { ZodType } from "zod";

export function parseRequestBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestException({
      message: "Invalid request body.",
      issues: result.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join(".") : "body",
        message: issue.message
      }))
    });
  }

  return result.data;
}
