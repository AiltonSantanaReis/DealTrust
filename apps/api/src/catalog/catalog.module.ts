import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminBrandsController } from "./admin-brands.controller.js";
import { AdminCategoriesController } from "./admin-categories.controller.js";
import { AdminProductVariantsController } from "./admin-product-variants.controller.js";
import { AdminProductsController } from "./admin-products.controller.js";
import { BrandsService } from "./brands.service.js";
import { CategoriesService } from "./categories.service.js";
import { ProductVariantsService } from "./product-variants.service.js";
import { ProductsService } from "./products.service.js";

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule],
  controllers: [
    AdminBrandsController,
    AdminCategoriesController,
    AdminProductVariantsController,
    AdminProductsController
  ],
  providers: [BrandsService, CategoriesService, ProductVariantsService, ProductsService]
})
export class CatalogModule {}
