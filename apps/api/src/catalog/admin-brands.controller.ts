import {
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
  Query
} from "@nestjs/common";
import { RequireRoles } from "../auth/require-roles.decorator.js";
import { parseRequestBody, parseRequestQuery, parseRouteParam } from "../shared/validation.js";
import { BrandsService } from "./brands.service.js";

@Controller("admin/brands")
@RequireRoles("admin", "owner")
export class AdminBrandsController {
  constructor(@Inject(BrandsService) private readonly brandsService: BrandsService) {}

  @Post()
  async create(@Body() body: unknown): Promise<BrandResponse> {
    const request = parseRequestBody(createBrandRequestSchema, body);
    const brand = await this.brandsService.create(request);

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
  async update(@Param("id") id: unknown, @Body() body: unknown): Promise<BrandResponse> {
    const brandId = parseRouteParam(publicIdSchema, id);
    const request = parseRequestBody(updateBrandRequestSchema, body);
    const brand = await this.brandsService.update(brandId, request);

    return brandResponseSchema.parse(brand);
  }

  @Delete(":id")
  @HttpCode(204)
  async delete(@Param("id") id: unknown): Promise<void> {
    const brandId = parseRouteParam(publicIdSchema, id);

    await this.brandsService.delete(brandId);
  }
}
