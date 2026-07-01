import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12).max(128);

export const registerRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const authUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120),
  email: emailSchema,
  role: z.enum(["user", "admin", "owner"])
});

export const authSessionSchema = z.object({
  accessToken: z.jwt(),
  tokenType: z.literal("Bearer"),
  expiresInSeconds: z.number().int().positive(),
  user: authUserSchema
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
