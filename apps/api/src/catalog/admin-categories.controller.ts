import {
  type AuthUser,
  type CategoryListResponse,
  type CategoryResponse,
  categoryListQuerySchema,
  categoryListResponseSchema,
  categoryResponseSchema,
  createCategoryRequestSchema,
  publicIdSchema,
  updateCategoryRequestSchema
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
import { CategoriesService } from "./categories.service.js";

@Controller("admin/categories")
@RequireRoles("admin", "owner")
export class AdminCategoriesController {
  constructor(@Inject(CategoriesService) private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<CategoryResponse> {
    const parsedBody = parseRequestBody(createCategoryRequestSchema, body);
    const category = await this.categoriesService.create(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return categoryResponseSchema.parse(category);
  }

  @Get()
  async list(@Query() query: unknown): Promise<CategoryListResponse> {
    const request = parseRequestQuery(categoryListQuerySchema, query);
    const response = await this.categoriesService.list(request);

    return categoryListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(@Param("id") id: unknown): Promise<CategoryResponse> {
    const categoryId = parseRouteParam(publicIdSchema, id);
    const category = await this.categoriesService.getById(categoryId);

    return categoryResponseSchema.parse(category);
  }

  @Patch(":id")
  async update(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<CategoryResponse> {
    const categoryId = parseRouteParam(publicIdSchema, id);
    const parsedBody = parseRequestBody(updateCategoryRequestSchema, body);
    const category = await this.categoriesService.update(categoryId, parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return categoryResponseSchema.parse(category);
  }

  @Delete(":id")
  @HttpCode(204)
  async archive(
    @Param("id") id: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<void> {
    const categoryId = parseRouteParam(publicIdSchema, id);

    await this.categoriesService.archive(categoryId, {
      actor: user,
      request: createAuditRequestContext(request)
    });
  }
}
