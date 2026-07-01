import type { AuthUserRole } from "@dealtrust/contracts";
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = Symbol("dealtrust:roles");

export function Roles(...roles: readonly AuthUserRole[]) {
  return SetMetadata(ROLES_KEY, roles);
}
