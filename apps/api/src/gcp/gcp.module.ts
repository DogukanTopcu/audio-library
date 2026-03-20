import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Storage } from "@google-cloud/storage";

export const GCP_STORAGE = Symbol("GCP_STORAGE");

@Global()
@Module({
  providers: [
    {
      provide: GCP_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Storage({
          projectId: config.get("GCP_PROJECT_ID"),
          credentials: JSON.parse(config.get("GCP_CREDENTIALS_JSON", "{}")),
        }),
    },
  ],
  exports: [GCP_STORAGE],
})
export class GcpModule {}