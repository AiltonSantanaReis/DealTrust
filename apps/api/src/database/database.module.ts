import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../config/api-config.module.js";
import { DatabaseService } from "./database.service.js";

@Module({
  imports: [ApiConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}
