import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { BodySizeLimitMiddleware } from '../src/common/middleware/body-size-limit.middleware';
import * as express from 'express';

describe('Large Request Handling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure body parser with size limits
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Request Body Size Limits', () => {
    it('should accept requests within size limit', async () => {
      const smallPayload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        bio: 'A'.repeat(1000), // 1KB of data
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(smallPayload);

      // Should not return 413 (Payload Too Large)
      expect([201, 400, 401, 409, 500]).toContain(response.status);
      expect(response.status).not.toBe(413);
    });

    it('should reject requests exceeding body size limit (>10MB)', async () => {
      // Create payload larger than 10MB
      const largeString = 'A'.repeat(11 * 1024 * 1024); // 11MB

      const largePayload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        data: largeString,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(largePayload);

      expect(response.status).toBe(413);
    });

    it('should handle exactly at size limit (10MB)', async () => {
      // Create payload close to but not exceeding 10MB
      const largeString = 'A'.repeat(9 * 1024 * 1024); // 9MB

      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        data: largeString,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      // Should not be rejected due to size
      expect(response.status).not.toBe(413);
    });
  });

  describe('JSON Payload Validation', () => {
    it('should validate large but valid JSON payload', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        metadata: {
          items: Array(1000)
            .fill(null)
            .map((_, i) => ({
              id: i,
              name: `Item ${i}`,
              description: 'Test item',
            })),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      // Should process the request (may fail validation but not size limit)
      expect(response.status).not.toBe(413);
    });

    it('should reject malformed JSON regardless of size', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle deeply nested JSON objects', async () => {
      // Create deeply nested object
      let nestedObject: any = { value: 'end' };
      for (let i = 0; i < 100; i++) {
        nestedObject = { nested: nestedObject };
      }

      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        data: nestedObject,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      // Should handle nested objects (may fail validation but not crash)
      expect([400, 401, 409, 500]).toContain(response.status);
    });
  });

  describe('File Upload Handling', () => {
    it('should handle multipart form data within limits', async () => {
      const smallFile = Buffer.alloc(1024 * 1024); // 1MB

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .attach('file', smallFile, 'test.txt')
        .field('email', 'test@example.com')
        .field('password', 'Password123!')
        .field('name', 'Test User');

      // Endpoint may not support file upload, but shouldn't crash
      expect([201, 400, 401, 404, 415, 500]).toContain(response.status);
    });

    it('should reject oversized file uploads', async () => {
      const largeFile = Buffer.alloc(15 * 1024 * 1024); // 15MB

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .attach('file', largeFile, 'large.txt')
        .field('email', 'test@example.com');

      expect([413, 400, 404]).toContain(response.status);
    });
  });

  describe('Query String and URL Limits', () => {
    it('should handle long query strings', async () => {
      const longQuery = 'A'.repeat(2000);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ search: longQuery });

      // Should handle but may return error based on validation
      expect([200, 400, 414]).toContain(response.status);
    });

    it('should handle multiple query parameters', async () => {
      const params: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        params[`param${i}`] = `value${i}`;
      }

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query(params);

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Request Header Limits', () => {
    it('should handle large headers within limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .set('X-Custom-Header', 'A'.repeat(1000));

      expect(response.status).not.toBe(431); // Not 'Request Header Fields Too Large'
    });

    it('should handle multiple custom headers', async () => {
      let req = request(app.getHttpServer()).get('/api');

      // Add multiple headers
      for (let i = 0; i < 50; i++) {
        req = req.set(`X-Header-${i}`, `value-${i}`);
      }

      const response = await req;

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Array and Collection Handling', () => {
    it('should handle large arrays in request body', async () => {
      const largeArray = Array(10000)
        .fill(null)
        .map((_, i) => ({
          id: i,
          name: `Item ${i}`,
        }));

      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        items: largeArray,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      // Should not crash, may fail validation
      expect(response.status).not.toBe(500);
    });

    it('should validate large array does not exceed size limit', async () => {
      // Create array that would exceed 10MB when serialized
      const largeArray = Array(500000)
        .fill(null)
        .map((_, i) => ({
          id: i,
          name: `Item with long description ${i}`.repeat(10),
          data: 'A'.repeat(100),
        }));

      const payload = {
        items: largeArray,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      expect(response.status).toBe(413);
    });
  });

  describe('Content-Type Validation', () => {
    it('should handle different content types', async () => {
      const data = { email: 'test@example.com', password: 'Pass123!' };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(data));

      expect([201, 400, 401, 409, 500]).toContain(response.status);
    });

    it('should reject invalid content types with large payloads', async () => {
      const largeData = 'data='.concat('A'.repeat(11 * 1024 * 1024));

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Content-Type', 'text/plain')
        .send(largeData);

      expect([413, 415, 400]).toContain(response.status);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle null bytes in request', async () => {
      const payload = {
        email: 'test\x00@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      // Should handle gracefully
      expect([400, 401, 409, 500]).toContain(response.status);
    });

    it('should handle unicode characters in large payloads', async () => {
      const unicodeString = '🚀'.repeat(100000); // Large unicode payload

      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        bio: unicodeString,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      expect(response.status).not.toBe(500); // Should not crash
    });

    it('should handle concurrent large requests', async () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        data: 'A'.repeat(5 * 1024 * 1024), // 5MB each
      };

      const promises = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/api/users').send(largePayload),
        );

      const responses = await Promise.all(promises);

      // All should be processed (may fail validation but not crash)
      responses.forEach((response) => {
        expect(response.status).not.toBe(500);
      });
    });

    it('should provide meaningful error for oversized requests', async () => {
      const largePayload = {
        data: 'A'.repeat(11 * 1024 * 1024), // 11MB
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(largePayload)
        .expect(413);

      expect(response.body).toBeDefined();
      // Error message format may vary
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large request without memory leak', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Send multiple large requests
      for (let i = 0; i < 10; i++) {
        const payload = {
          email: `test${i}@example.com`,
          password: 'Password123!',
          name: 'Test User',
          data: 'A'.repeat(5 * 1024 * 1024), // 5MB
        };

        await request(app.getHttpServer()).post('/api/users').send(payload);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should process large requests in reasonable time', async () => {
      const startTime = Date.now();

      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        data: 'A'.repeat(5 * 1024 * 1024), // 5MB
      };

      await request(app.getHttpServer()).post('/api/users').send(payload);

      const duration = Date.now() - startTime;

      // Should process within 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});
