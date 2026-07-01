import {
  type AdminStoreListResponse,
  type AdminStoreResponse,
  type AuthUser,
  adminStoreListQuerySchema,
  adminStoreListResponseSchema,
  adminStoreResponseSchema,
  createAdminStoreRequestSchema,
  publicIdSchema,
  updateAdminStoreRequestSchema
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
import { StoresService } from "./stores.service.js";

@Controller("admin/stores")
@RequireRoles("admin", "owner")
export class AdminStoresController {
  constructor(@Inject(StoresService) private readonly storesService: StoresService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminStoreResponse> {
    const parsedBody = parseRequestBody(createAdminStoreRequestSchema, body);
    const store = await this.storesService.create(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminStoreResponseSchema.parse(store);
  }

  @Get()
  async list(@Query() query: unknown): Promise<AdminStoreListResponse> {
    const request = parseRequestQuery(adminStoreListQuerySchema, query);
    const response = await this.storesService.list(request);

    return adminStoreListResponseSchema.parse(response);
  }

  @Get(":id")
  async getById(@Param("id") id: unknown): Promise<AdminStoreResponse> {
    const storeId = parseRouteParam(publicIdSchema, id);
    const store = await this.storesService.getById(storeId);

    return adminStoreResponseSchema.parse(store);
  }

  @Patch(":id")
  async update(
    @Param("id") id: unknown,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<AdminStoreResponse> {
    const storeId = parseRouteParam(publicIdSchema, id);
    const parsedBody = parseRequestBody(updateAdminStoreRequestSchema, body);
    const store = await this.storesService.update(storeId, parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return adminStoreResponseSchema.parse(store);
  }

  @Delete(":id")
  @HttpCode(204)
  async archive(
    @Param("id") id: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<void> {
    const storeId = parseRouteParam(publicIdSchema, id);

    await this.storesService.archive(storeId, {
      actor: user,
      request: createAuditRequestContext(request)
    });
  }
}
