import type { AuthUser } from "@dealtrust/contracts";
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "./authenticated-request.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  }
);
