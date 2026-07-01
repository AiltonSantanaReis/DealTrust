import {
  type AuthSession,
  authSessionSchema,
  authUserSchema,
  loginRequestSchema,
  registerRequestSchema
} from "@dealtrust/contracts";
import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { parseRequestBody } from "../shared/validation.js";
import { AuthService } from "./auth.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: unknown): Promise<AuthSession> {
    const request = parseRequestBody(registerRequestSchema, body);
    const session = await this.authService.register(request);

    return authSessionSchema.parse(session);
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: unknown): Promise<AuthSession> {
    const request = parseRequestBody(loginRequestSchema, body);
    const session = await this.authService.login(request);

    return authSessionSchema.parse(session);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthSession["user"]): AuthSession["user"] {
    return authUserSchema.parse(user);
  }
}
