import {
  type AdminAuditLogListResponse,
  adminAuditLogListQuerySchema,
  adminAuditLogListResponseSchema
} from "@dealtrust/contracts";
import { Controller, Get, Inject, Query } from "@nestjs/common";
import { RequireRoles } from "../auth/require-roles.decorator.js";
import { parseRequestQuery } from "../shared/validation.js";
import { AdminAuditService } from "./admin-audit.service.js";

@Controller("admin/audit-logs")
@RequireRoles("owner")
export class AdminAuditLogsController {
  constructor(@Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService) {}

  @Get()
  async list(@Query() query: unknown): Promise<AdminAuditLogListResponse> {
    const request = parseRequestQuery(adminAuditLogListQuerySchema, query);
    const response = await this.adminAuditService.list(request);

    return adminAuditLogListResponseSchema.parse(response);
  }
}
