import {
  type AdminPriceSnapshotListResponse,
  type AdminPriceSnapshotResponse,
  type AuthUser,
  adminPriceSnapshotListQuerySchema,
  adminPriceSnapshotListResponseSchema,
  adminPriceSnapshotResponseSchema,
  createAdminPriceSnapshotRequestSchema,
  publicIdSchema
} from "@dealtrust/contracts";
import { Body, Controller, Get, Inject, Param, Post, Query, Req } from "@nestjs/common";
import { createAuditRequestContext } from "../audit/audit-request-context.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequireRoles } from "../auth/require-roles.decorator.js";
import { parseRequestBody, parseRequestQuery, parseRouteParam } from "../shared/validation.js";
import { PriceSnapshotsService } from "./price-snapshots.service.js";

@Controller("admin/price-snapshots")
@RequireRoles("admin", "owner")
export class AdminPriceSnapshotsController {
  constructor(
    @Inject(PriceSnapshotsService) private readonly priceSnapshotsService: PriceSnapshotsService
  ) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminPriceSnapshotResponse> {
    const parsedBody = parseRequestBody(createAdminPriceSnapshotRequestSchema, body);
    const snapshot = await this.priceSnapshotsService.create(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminPriceSnapshotResponseSchema.parse(snapshot);
  }

  @Get()
  async list(@Query() query: unknown): Promise<AdminPriceSnapshotListResponse> {
    const request = parseRequestQuery(adminPriceSnapshotListQuerySchema, query);
    const response = await this.priceSnapshotsService.list(request);

    return adminPriceSnapshotListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(@Param("id") id: unknown): Promise<AdminPriceSnapshotResponse> {
    const snapshotId = parseRouteParam(publicIdSchema, id);
    const snapshot = await this.priceSnapshotsService.getById(snapshotId);

    return adminPriceSnapshotResponseSchema.parse(snapshot);
  }
}
