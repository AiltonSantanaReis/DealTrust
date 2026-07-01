import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { API_CONFIG, type ApiConfig } from "../config/api-config.js";

type HeaderResponse = {
  header(name: string, value: string): void;
};

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<HeaderResponse>();

    response.header("x-content-type-options", "nosniff");
    response.header("x-frame-options", "DENY");
    response.header("referrer-policy", "no-referrer");
    response.header("cross-origin-opener-policy", "same-origin");
    response.header("cross-origin-resource-policy", "same-origin");
    response.header(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    );
    response.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");

    if (this.config.environment === "production") {
      response.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    }

    return next.handle();
  }
}
