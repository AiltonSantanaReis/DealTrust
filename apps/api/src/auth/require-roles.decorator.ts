import type { AuthUserRole } from "@dealtrust/contracts";
import { applyDecorators, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { Roles } from "./roles.decorator.js";
import { RolesGuard } from "./roles.guard.js";

export function RequireRoles(...roles: readonly AuthUserRole[]) {
  return applyDecorators(Roles(...roles), UseGuards(JwtAuthGuard, RolesGuard));
}
