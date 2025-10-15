import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserController } from './user/user.controller';
import { HealthModule } from './health/health.module';
import databaseConfig from './config/database.config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (
        configService: ConfigService,
      ): import('@nestjs/throttler').ThrottlerModuleOptions => ({
        ttl: Number(configService.get('THROTTLE_TTL')),
        limit: Number(configService.get('THROTTLE_LIMIT')),
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    DatabaseModule,
    HealthModule,
  ],
  controllers: [AppController, UserController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
