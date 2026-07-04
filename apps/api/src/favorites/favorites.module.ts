import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { FavoriteListsController } from "./favorite-lists.controller.js";
import { FavoriteListsService } from "./favorite-lists.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [FavoriteListsController],
  providers: [FavoriteListsService]
})
export class FavoritesModule {}
