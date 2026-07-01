import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../config/api-config.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { PasswordService } from "./password.service.js";
import { RolesGuard } from "./roles.guard.js";
import { TokenService } from "./token.service.js";

@Module({
  imports: [ApiConfigModule, DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, TokenService]
})
export class AuthModule {}
