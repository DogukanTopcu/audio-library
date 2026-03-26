import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module.js";
import { DrizzleModule } from "./drizzle/drizzle.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { GcpModule } from "./gcp/gcp.module.js";
import { AuditLogModule } from "./common/audit-log.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { ContentModule } from "./content/content.module.js";
import { ChaptersModule } from "./chapters/chapters.module.js";
import { AudioRecordsModule } from "./audio-records/audio-records.module.js";
import { QuestionsModule } from "./questions/questions.module.js";
import { UsersModule } from "./users/users.module.js";
import { AdminsModule } from "./admins/admins.module.js";
import { SiteConfigModule } from "./config/config.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { UploadModule } from "./upload/upload.module.js";
import { PlayerModule } from "./player/player.module.js";
import { SpeechModule } from "./speech/speech.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        ".env.local",
        ".env",
        "../../.env.local",
        "../../.env",
      ],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl:   config.get<number>("THROTTLE_TTL", 60),
          limit: config.get<number>("THROTTLE_LIMIT", 20),
        }],
      }),
    }),
    DrizzleModule,
    RedisModule,
    GcpModule,
    AuthModule,
    AuditLogModule,
    CategoriesModule,
    ContentModule,
    ChaptersModule,
    AudioRecordsModule,
    QuestionsModule,
    UsersModule,
    AdminsModule,
    SiteConfigModule,
    DashboardModule,
    UploadModule,
    PlayerModule,
    SpeechModule,
  ],
})
export class AppModule {}
