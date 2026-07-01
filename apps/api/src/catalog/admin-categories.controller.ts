import {
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
  Query
} from "@nestjs/common";
import { RequireRoles } from "../auth/require-roles.decorator.js";
import { parseRequestBody, parseRequestQuery, parseRouteParam } from "../shared/validation.js";
import { CategoriesService } from "./categories.service.js";

@Controller("admin/categories")
@RequireRoles("admin", "owner")
export class AdminCategoriesController {
  constructor(@Inject(CategoriesService) private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@Body() body: unknown): Promise<CategoryResponse> {
    const request = parseRequestBody(createCategoryRequestSchema, body);
    const category = await this.categoriesService.create(request);

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
  async update(@Param("id") id: unknown, @Body() body: unknown): Promise<CategoryResponse> {
    const categoryId = parseRouteParam(publicIdSchema, id);
    const request = parseRequestBody(updateCategoryRequestSchema, body);
    const category = await this.categoriesService.update(categoryId, request);

    return categoryResponseSchema.parse(category);
  }

  @Delete(":id")
  @HttpCode(204)
  async archive(@Param("id") id: unknown): Promise<void> {
    const categoryId = parseRouteParam(publicIdSchema, id);

    await this.categoriesService.archive(categoryId);
  }
}
