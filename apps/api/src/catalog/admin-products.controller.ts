import {
  type AdminProductListResponse,
  type AdminProductResponse,
  type AuthUser,
  adminProductListQuerySchema,
  adminProductListResponseSchema,
  adminProductResponseSchema,
  createAdminProductRequestSchema,
  publicIdSchema,
  updateAdminProductRequestSchema
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
import { ProductsService } from "./products.service.js";

@Controller("admin/products")
@RequireRoles("admin", "owner")
export class AdminProductsController {
  constructor(@Inject(ProductsService) private readonly productsService: ProductsService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminProductResponse> {
    const parsedBody = parseRequestBody(createAdminProductRequestSchema, body);
    const product = await this.productsService.create(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminProductResponseSchema.parse(product);
  }

  @Get()
  async list(@Query() query: unknown): Promise<AdminProductListResponse> {
    const request = parseRequestQuery(adminProductListQuerySchema, query);
    const response = await this.productsService.list(request);

    return adminProductListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(@Param("id") id: unknown): Promise<AdminProductResponse> {
    const productId = parseRouteParam(publicIdSchema, id);
    const product = await this.productsService.getById(productId);

    return adminProductResponseSchema.parse(product);
  }

  @Patch(":id")
  async update(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminProductResponse> {
    const productId = parseRouteParam(publicIdSchema, id);
    const parsedBody = parseRequestBody(updateAdminProductRequestSchema, body);
    const product = await this.productsService.update(productId, parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminProductResponseSchema.parse(product);
  }

  @Delete(":id")
  @HttpCode(204)
  async archive(
    @Param("id") id: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<void> {
    const productId = parseRouteParam(publicIdSchema, id);

    await this.productsService.archive(productId, {
      actor: user,
      request: createAuditRequestContext(request)
    });
  }
}
