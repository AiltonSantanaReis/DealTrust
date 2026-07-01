import {
  type AdminProductVariantListResponse,
  type AdminProductVariantResponse,
  type AuthUser,
  adminProductVariantListQuerySchema,
  adminProductVariantListResponseSchema,
  adminProductVariantResponseSchema,
  createAdminProductVariantRequestSchema,
  publicIdSchema,
  updateAdminProductVariantRequestSchema
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
import { ProductVariantsService } from "./product-variants.service.js";

@Controller("admin/product-variants")
@RequireRoles("admin", "owner")
export class AdminProductVariantsController {
  constructor(
    @Inject(ProductVariantsService) private readonly productVariantsService: ProductVariantsService
  ) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminProductVariantResponse> {
    const parsedBody = parseRequestBody(createAdminProductVariantRequestSchema, body);
    const variant = await this.productVariantsService.create(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminProductVariantResponseSchema.parse(variant);
  }

  @Get()
  async list(@Query() query: unknown): Promise<AdminProductVariantListResponse> {
    const request = parseRequestQuery(adminProductVariantListQuerySchema, query);
    const response = await this.productVariantsService.list(request);

    return adminProductVariantListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(@Param("id") id: unknown): Promise<AdminProductVariantResponse> {
    const variantId = parseRouteParam(publicIdSchema, id);
    const variant = await this.productVariantsService.getById(variantId);

    return adminProductVariantResponseSchema.parse(variant);
  }

  @Patch(":id")
  async update(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminProductVariantResponse> {
    const variantId = parseRouteParam(publicIdSchema, id);
    const parsedBody = parseRequestBody(updateAdminProductVariantRequestSchema, body);
    const variant = await this.productVariantsService.update(variantId, parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminProductVariantResponseSchema.parse(variant);
  }

  @Delete(":id")
  @HttpCode(204)
  async archive(
    @Param("id") id: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<void> {
    const variantId = parseRouteParam(publicIdSchema, id);

    await this.productVariantsService.archive(variantId, {
      actor: user,
      request: createAuditRequestContext(request)
    });
  }
}
