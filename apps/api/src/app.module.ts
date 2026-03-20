import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { DrizzleModule } from "./drizzle/drizzle.module";
import { RedisModule } from "./redis/redis.module";
import { GcpModule } from "./gcp/gcp.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}