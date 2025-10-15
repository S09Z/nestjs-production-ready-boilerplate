import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: DatabaseService.buildDatabaseUrl(configService),
        },
      },
      log: configService.get('database.logging')
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Check database connection health
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database connection check failed', error);
      return false;
    }
  }

  /**
   * Get database connection info
   */
  getDatabaseInfo() {
    return {
      host: this.configService.get('database.host'),
      port: this.configService.get('database.port'),
      database: this.configService.get('database.name'),
      user: this.configService.get('database.username'),
    };
  }

  /**
   * Build database URL from config
   */
  private static buildDatabaseUrl(configService: ConfigService): string {
    const host = configService.get('database.host');
    const port = configService.get('database.port');
    const username = configService.get('database.username');
    const password = configService.get('database.password');
    const database = configService.get('database.name');

    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }
}