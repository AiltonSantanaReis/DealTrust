import {
  type AuthUser,
  createFavoriteListRequestSchema,
  type FavoriteListItemResponse,
  type FavoriteListListResponse,
  type FavoriteListResponse,
  favoriteListItemRequestSchema,
  favoriteListItemResponseSchema,
  favoriteListListResponseSchema,
  favoriteListQuerySchema,
  favoriteListResponseSchema,
  publicIdSchema,
  updateFavoriteListRequestSchema
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
import { FavoriteListsService } from "./favorite-lists.service.js";

@Controller("favorite-lists")
@UseGuards(JwtAuthGuard)
export class FavoriteListsController {
  constructor(
    @Inject(FavoriteListsService) private readonly favoriteListsService: FavoriteListsService
  ) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<FavoriteListResponse> {
    const request = parseRequestBody(createFavoriteListRequestSchema, body);
    const list = await this.favoriteListsService.create(request, user);

    return favoriteListResponseSchema.parse(list);
  }

  @Get()
  async list(
    @Query() query: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<FavoriteListListResponse> {
    const request = parseRequestQuery(favoriteListQuerySchema, query);
    const response = await this.favoriteListsService.list(request, user);

    return favoriteListListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(
    @Param("id") id: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<FavoriteListResponse> {
    const listId = parseRouteParam(publicIdSchema, id);
    const list = await this.favoriteListsService.getById(listId, user);

    return favoriteListResponseSchema.parse(list);
  }

  @Patch(":id")
  async update(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<FavoriteListResponse> {
    const listId = parseRouteParam(publicIdSchema, id);
    const request = parseRequestBody(updateFavoriteListRequestSchema, body);
    const list = await this.favoriteListsService.update(listId, request, user);

    return favoriteListResponseSchema.parse(list);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    const listId = parseRouteParam(publicIdSchema, id);

    await this.favoriteListsService.remove(listId, user);
  }

  @Post(":id/items")
  async addItem(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<FavoriteListItemResponse> {
    const listId = parseRouteParam(publicIdSchema, id);
    const request = parseRequestBody(favoriteListItemRequestSchema, body);
    const item = await this.favoriteListsService.addItem(listId, request, user);

    return favoriteListItemResponseSchema.parse(item);
  }

  @Delete(":id/items/:productVariantId")
  @HttpCode(204)
  async removeItem(
    @Param("id") id: unknown,
    @Param("productVariantId") productVariantId: unknown,
    @CurrentUser() user: AuthUser
  ): Promise<void> {
    const listId = parseRouteParam(publicIdSchema, id);
    const variantId = parseRouteParam(publicIdSchema, productVariantId);

    await this.favoriteListsService.removeItem(listId, variantId, user);
  }
}
