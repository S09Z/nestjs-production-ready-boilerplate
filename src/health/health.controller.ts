import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private databaseService: DatabaseService,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Comprehensive health check',
    description:
      'Performs a full health check including database, memory, and disk storage',
  })
  @ApiResponse({
    status: 200,
    description: 'All health checks passed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          example: {
            database: { status: 'up' },
            memory_heap: { status: 'up' },
            memory_rss: { status: 'up' },
            storage: { status: 'up' },
          },
        },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more health checks failed',
  })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', this.databaseService),
      () =>
        this.memory.checkHeap(
          'memory_heap',
          this.configService.get('health.memory.heap', 150 * 1024 * 1024),
        ),
      () =>
        this.memory.checkRSS(
          'memory_rss',
          this.configService.get('health.memory.rss', 150 * 1024 * 1024),
        ),
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: this.configService.get(
            'health.disk.thresholdPercent',
            0.9,
          ),
        }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Checks if the application is ready to accept traffic (database connection)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          example: {
            database: { status: 'up' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database', this.databaseService),
    ]);
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description:
      'Checks if the application process is alive (always returns OK)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  live() {
    return { status: 'ok' };
  }
}
