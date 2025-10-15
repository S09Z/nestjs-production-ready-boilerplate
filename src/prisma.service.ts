import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '../generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'error' | 'info' | 'warn'
  >
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
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
    await this.$connect();
    this.logger.log('Successfully connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  // Helper method for transactions
  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn);
  }

  // Graceful shutdown
  enableShutdownHooks(app: { close: () => Promise<void> }) {
    this.$on('beforeExit' as never, () => {
      app.close();
    });
  }
}
