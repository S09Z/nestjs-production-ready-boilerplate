import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    info?: {
      host: string;
      port: number;
      database: string;
      user: string;
    };
  };
  uptime: number;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthCheckResponse> {
    const isDatabaseConnected = await this.databaseService.checkConnection();

    return {
      status: isDatabaseConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        connected: isDatabaseConnected,
        info: isDatabaseConnected
          ? this.databaseService.getDatabaseInfo()
          : undefined,
      },
      uptime: process.uptime(),
    };
  }

  @Get('database')
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({ status: 200, description: 'Database is connected' })
  @ApiResponse({ status: 503, description: 'Database is disconnected' })
  async checkDatabase() {
    const isConnected = await this.databaseService.checkConnection();

    return {
      status: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      info: isConnected ? this.databaseService.getDatabaseInfo() : undefined,
    };
  }
}
