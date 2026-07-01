import {
  type AuthSession,
  authSessionSchema,
  loginRequestSchema,
  registerRequestSchema
} from "@dealtrust/contracts";
import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { parseRequestBody } from "../shared/validation.js";
import { AuthService } from "./auth.service.js";

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
}
