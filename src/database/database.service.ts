import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '../../generated/prisma';

@Injectable()
export class DatabaseService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'error' | 'info' | 'warn'
  >
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: DatabaseService.buildDatabaseUrl(configService),
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    // Log queries in development
    if (configService.get('app.nodeEnv') === 'development') {
      this.$on('query', (e) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    this.$on('error', (e) => {
      this.logger.error(e);
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
   * Helper method for transactions
   */
  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn);
  }

  /**
   * Graceful shutdown
   */
  enableShutdownHooks(app: { close: () => Promise<void> }) {
    this.$on('beforeExit' as never, () => {
      app.close();
    });
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

    // URL-encode password to handle special characters
    const encodedPassword = encodeURIComponent(password || '');

    return `postgresql://${username}:${encodedPassword}@${host}:${port}/${database}`;
  }
}
