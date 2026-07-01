import {
  type ProductSearchResponse,
  type PublicProductDetailResponse,
  productDetailQuerySchema,
  productSearchQuerySchema,
  productSearchResponseSchema,
  publicIdSchema,
  publicProductDetailResponseSchema
} from "@dealtrust/contracts";
import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { parseRequestQuery, parseRouteParam } from "../shared/validation.js";
import { PublicProductsService } from "./public-products.service.js";

@Controller("products")
export class PublicProductsController {
  constructor(
    @Inject(PublicProductsService) private readonly publicProductsService: PublicProductsService
  ) {}

  @Get()
  async search(@Query() query: unknown): Promise<ProductSearchResponse> {
    const request = parseRequestQuery(productSearchQuerySchema, query);
    const response = await this.publicProductsService.search(request);

    return productSearchResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(
    @Param("id") id: unknown,
    @Query() query: unknown
  ): Promise<PublicProductDetailResponse> {
    const productId = parseRouteParam(publicIdSchema, id);
    const request = parseRequestQuery(productDetailQuerySchema, query);
    const response = await this.publicProductsService.getById(productId, request);

    return publicProductDetailResponseSchema.parse(response);
  }
}
