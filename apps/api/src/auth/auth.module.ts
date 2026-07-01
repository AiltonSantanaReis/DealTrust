import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../config/api-config.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { PasswordService } from "./password.service.js";
import { TokenService } from "./token.service.js";

@Module({
  imports: [ApiConfigModule, DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService]
})
export class AuthModule {}
