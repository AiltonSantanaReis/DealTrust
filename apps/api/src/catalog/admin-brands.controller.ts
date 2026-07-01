import {
  type AuthUser,
  type BrandListResponse,
  type BrandResponse,
  brandListQuerySchema,
  brandListResponseSchema,
  brandResponseSchema,
  createBrandRequestSchema,
  publicIdSchema,
  updateBrandRequestSchema
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
import { BrandsService } from "./brands.service.js";

@Controller("admin/brands")
@RequireRoles("admin", "owner")
export class AdminBrandsController {
  constructor(@Inject(BrandsService) private readonly brandsService: BrandsService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<BrandResponse> {
    const parsedBody = parseRequestBody(createBrandRequestSchema, body);
    const brand = await this.brandsService.create(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return brandResponseSchema.parse(brand);
  }

  @Get()
  async list(@Query() query: unknown): Promise<BrandListResponse> {
    const request = parseRequestQuery(brandListQuerySchema, query);
    const response = await this.brandsService.list(request);

    return brandListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(@Param("id") id: unknown): Promise<BrandResponse> {
    const brandId = parseRouteParam(publicIdSchema, id);
    const brand = await this.brandsService.getById(brandId);

    return brandResponseSchema.parse(brand);
  }

  @Patch(":id")
  async update(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<BrandResponse> {
    const brandId = parseRouteParam(publicIdSchema, id);
    const parsedBody = parseRequestBody(updateBrandRequestSchema, body);
    const brand = await this.brandsService.update(brandId, parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return brandResponseSchema.parse(brand);
  }

  @Delete(":id")
  @HttpCode(204)
  async delete(
    @Param("id") id: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<void> {
    const brandId = parseRouteParam(publicIdSchema, id);

    await this.brandsService.delete(brandId, {
      actor: user,
      request: createAuditRequestContext(request)
    });
  }
}
