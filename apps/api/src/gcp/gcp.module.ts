import { Module, Global, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Storage } from "@google-cloud/storage";

export const GCP_STORAGE = Symbol("GCP_STORAGE");
const logger = new Logger("GcpModule");

@Global()
@Module({
  providers: [
    {
      provide: GCP_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const credentialsJson = config.get<string>("GCP_CREDENTIALS_JSON");
        let credentials: Record<string, unknown> | undefined;

        if (credentialsJson) {
          try {
            credentials = JSON.parse(credentialsJson) as Record<string, unknown>;
          } catch {
            logger.warn(
              "Ignoring invalid GCP_CREDENTIALS_JSON. Upload routes will require valid credentials before use.",
            );
          }
        }

        return new Storage({
          projectId: config.get("GCP_PROJECT_ID"),
          ...(credentials ? { credentials } : {}),
        });
      },
    },
  ],
  exports: [GCP_STORAGE],
})
export class GcpModule {}
