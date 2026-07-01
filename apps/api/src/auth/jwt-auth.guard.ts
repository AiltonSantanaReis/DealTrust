import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedRequest } from "./authenticated-request.js";
import { TokenService } from "./token.service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    const claims = await this.tokenService.verifyAccessToken(token);

    if (!claims) {
      throw new UnauthorizedException("Invalid bearer token.");
    }

    const user = await this.authService.findActiveUserById(claims.sub);

    if (!user) {
      throw new UnauthorizedException("User is not active.");
    }

    request.user = user;

    return true;
  }
}

function extractBearerToken(
  authorization: string | readonly string[] | undefined
): string | undefined {
  const value = Array.isArray(authorization) ? authorization.at(0) : authorization;

  if (!value) {
    return undefined;
  }

  const parts = value.split(" ");

  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer" || !parts[1]) {
    return undefined;
  }

  return parts[1];
}
