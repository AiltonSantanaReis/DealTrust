import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminBrandsController } from "./admin-brands.controller.js";
import { AdminCategoriesController } from "./admin-categories.controller.js";
import { AdminProductsController } from "./admin-products.controller.js";
import { BrandsService } from "./brands.service.js";
import { CategoriesService } from "./categories.service.js";
import { ProductsService } from "./products.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AdminBrandsController, AdminCategoriesController, AdminProductsController],
  providers: [BrandsService, CategoriesService, ProductsService]
})
export class CatalogModule {}
