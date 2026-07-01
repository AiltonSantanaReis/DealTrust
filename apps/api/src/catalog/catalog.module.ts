import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminCategoriesController } from "./admin-categories.controller.js";
import { CategoriesService } from "./categories.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AdminCategoriesController],
  providers: [CategoriesService]
})
export class CatalogModule {}
