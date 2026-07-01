import {
  type AuthUser,
  createPriceAlertRequestSchema,
  type PriceAlertListResponse,
  type PriceAlertResponse,
  priceAlertListQuerySchema,
  priceAlertListResponseSchema,
  priceAlertResponseSchema,
  publicIdSchema,
  updatePriceAlertRequestSchema
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
  UseGuards
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseRequestBody, parseRequestQuery, parseRouteParam } from "../shared/validation.js";
import { PriceAlertsService } from "./price-alerts.service.js";

@Controller("alerts")
@UseGuards(JwtAuthGuard)
export class PriceAlertsController {
  constructor(
    @Inject(PriceAlertsService) private readonly priceAlertsService: PriceAlertsService
  ) {}

  @Post()
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<PriceAlertResponse> {
    const request = parseRequestBody(createPriceAlertRequestSchema, body);
    const alert = await this.priceAlertsService.create(request, user);

    return priceAlertResponseSchema.parse(alert);
  }

  @Get()
  async list(
    @Query() query: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<PriceAlertListResponse> {
    const request = parseRequestQuery(priceAlertListQuerySchema, query);
    const response = await this.priceAlertsService.list(request, user);

    return priceAlertListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(
    @Param("id") id: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<PriceAlertResponse> {
    const alertId = parseRouteParam(publicIdSchema, id);
    const alert = await this.priceAlertsService.getById(alertId, user);

    return priceAlertResponseSchema.parse(alert);
  }

  @Patch(":id")
  async update(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<PriceAlertResponse> {
    const alertId = parseRouteParam(publicIdSchema, id);
    const request = parseRequestBody(updatePriceAlertRequestSchema, body);
    const alert = await this.priceAlertsService.update(alertId, request, user);

    return priceAlertResponseSchema.parse(alert);
  }

  @Delete(":id")
  @HttpCode(204)
  async cancel(@Param("id") id: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    const alertId = parseRouteParam(publicIdSchema, id);

    await this.priceAlertsService.cancel(alertId, user);
  }
}
