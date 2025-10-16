import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: configService.get('app.corsOrigins'),
    credentials: true,
  });

  // Compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // API Prefix
  const apiPrefix = configService.get('app.apiPrefix', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Swagger/OpenAPI Documentation
  if (configService.get('app.nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NestJS Production-Ready API')
      .setDescription(
        'A production-ready NestJS API boilerplate with authentication, database integration, caching, rate limiting, and comprehensive health checks.',
      )
      .setVersion('1.0.0')
      .setContact(
        'API Support',
        'https://github.com/your-org/your-repo',
        'support@example.com',
      )
      .setLicense(
        'MIT',
        'https://github.com/your-org/your-repo/blob/main/LICENSE',
      )
      .addTag('Application', 'Application-level endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Health', 'Health check and monitoring endpoints')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        'JWT',
      )
      .addServer(
        `http://localhost:${configService.get('app.port', 3000)}`,
        'Local development',
      )
      .addServer('https://api.staging.example.com', 'Staging server')
      .addServer('https://api.example.com', 'Production server')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (_controllerKey: string, methodKey: string) =>
        methodKey,
    });

    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'NestJS API Documentation',
      customfavIcon: 'https://nestjs.com/img/logo-small.svg',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #e0234e }
      `,
    });

    console.log(
      `📚 Swagger documentation available at: http://localhost:${configService.get('app.port', 3000)}/${apiPrefix}/docs`,
    );
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get('app.port', 3000);
  await app.listen(port);
  console.log(
    `Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
}
bootstrap();
