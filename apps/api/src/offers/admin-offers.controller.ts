import {
  type AdminOfferListResponse,
  type AdminOfferResponse,
  type AuthUser,
  adminOfferListQuerySchema,
  adminOfferListResponseSchema,
  adminOfferResponseSchema,
  createAdminOfferRequestSchema,
  publicIdSchema,
  updateAdminOfferRequestSchema
} from "@dealtrust/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import { createAuditRequestContext } from "../audit/audit-request-context.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequireRoles } from "../auth/require-roles.decorator.js";
import { parseRequestBody, parseRequestQuery, parseRouteParam } from "../shared/validation.js";
import { OffersService } from "./offers.service.js";

@Controller("admin/offers")
@RequireRoles("admin", "owner")
export class AdminOffersController {
  constructor(@Inject(OffersService) private readonly offersService: OffersService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminOfferResponse> {
    const parsedBody = parseRequestBody(createAdminOfferRequestSchema, body);
    const offer = await this.offersService.create(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminOfferResponseSchema.parse(offer);
  }

  @Get()
  async list(@Query() query: unknown): Promise<AdminOfferListResponse> {
    const request = parseRequestQuery(adminOfferListQuerySchema, query);
    const response = await this.offersService.list(request);

    return adminOfferListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(@Param("id") id: unknown): Promise<AdminOfferResponse> {
    const offerId = parseRouteParam(publicIdSchema, id);
    const offer = await this.offersService.getById(offerId);

    return adminOfferResponseSchema.parse(offer);
  }

  @Patch(":id")
  async update(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminOfferResponse> {
    const offerId = parseRouteParam(publicIdSchema, id);
    const parsedBody = parseRequestBody(updateAdminOfferRequestSchema, body);
    const offer = await this.offersService.update(offerId, parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminOfferResponseSchema.parse(offer);
  }

  @Delete(":id")
  @HttpCode(204)
  async expire(
    @Param("id") id: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<void> {
    const offerId = parseRouteParam(publicIdSchema, id);

    await this.offersService.expire(offerId, {
      actor: user,
      request: createAuditRequestContext(request)
    });
  }
}
