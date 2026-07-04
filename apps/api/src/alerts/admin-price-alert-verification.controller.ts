import {
  type AuthUser,
  type PriceAlertVerificationResponse,
  priceAlertVerificationRequestSchema,
  priceAlertVerificationResponseSchema
} from "@dealtrust/contracts";
import { Body, Controller, HttpCode, Inject, Post, Req } from "@nestjs/common";
import { createAuditRequestContext } from "../audit/audit-request-context.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequireRoles } from "../auth/require-roles.decorator.js";
import { parseRequestBody } from "../shared/validation.js";
import { PriceAlertVerificationService } from "./price-alert-verification.service.js";

@Controller("admin/alerts/verify")
@RequireRoles("admin", "owner")
export class AdminPriceAlertVerificationController {
  constructor(
    @Inject(PriceAlertVerificationService)
    private readonly priceAlertVerificationService: PriceAlertVerificationService
  ) {}

  @Post()
  @HttpCode(200)
  async verify(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<PriceAlertVerificationResponse> {
    const parsedBody = parseRequestBody(priceAlertVerificationRequestSchema, body);
    const response = await this.priceAlertVerificationService.verifyActiveAlerts(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return priceAlertVerificationResponseSchema.parse(response);
  }
}
