import { Module } from "@nestjs/common";
import { API_CONFIG, loadApiConfig } from "./api-config.js";

@Module({
  providers: [
    {
      provide: API_CONFIG,
      useFactory: () => loadApiConfig(process.env)
    }
  ],
  exports: [API_CONFIG]
})
export class ApiConfigModule {}
