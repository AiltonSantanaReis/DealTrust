import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "../config/api-config.module.js";
import { RateLimitGuard } from "./rate-limit.guard.js";
import { SecurityHeadersInterceptor } from "./security-headers.interceptor.js";

@Module({
  imports: [ApiConfigModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor
    }
  ]
})
export class SecurityModule {}
