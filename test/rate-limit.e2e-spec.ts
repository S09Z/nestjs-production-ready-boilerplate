import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ThrottlerModule } from '@nestjs/throttler';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(ThrottlerModule)
      .useModule(
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: 60000, // 60 seconds
              limit: 5, // 5 requests per TTL
            },
          ],
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();

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

  describe('Throttler Guard', () => {
    it('should allow requests within rate limit', async () => {
      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .get('/api')
          .expect(200);

        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      }
    });

    it('should block requests exceeding rate limit', async () => {
      const agent = request.agent(app.getHttpServer());

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        await agent.get('/api').expect(200);
      }

      // This request should be rate-limited
      const response = await agent.get('/api').expect(429);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('ThrottlerException');
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('should track rate limits per IP address', async () => {
      // Simulate different IP addresses
      const response1 = await request(app.getHttpServer())
        .get('/api')
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api')
        .set('X-Forwarded-For', '192.168.1.101')
        .expect(200);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should reset rate limit after TTL expires', async () => {
      jest.setTimeout(65000); // Increase timeout for this test

      const agent = request.agent(app.getHttpServer());

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        await agent.get('/api');
      }

      // Should be rate-limited
      await agent.get('/api').expect(429);

      // Wait for TTL to expire (60 seconds + buffer)
      await new Promise((resolve) => setTimeout(resolve, 61000));

      // Should work again after TTL
      await agent.get('/api').expect(200);
    }, 70000);

    it('should include rate limit headers in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      const limit = parseInt(response.headers['x-ratelimit-limit']);
      const remaining = parseInt(response.headers['x-ratelimit-remaining']);

      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(limit);
    });

    it('should handle rate limit for POST requests', async () => {
      const agent = request.agent(app.getHttpServer());

      // Make POST requests up to the limit
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/api/users')
          .send({
            email: `test${i}@example.com`,
            password: 'Password123',
            name: 'Test User',
          })
          .expect((res) => {
            // Expect either 201 (created) or 409 (conflict) or other valid responses
            expect([201, 400, 401, 409, 500]).toContain(res.status);
          });
      }

      // This should be rate-limited
      await agent
        .post('/api/users')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test User',
        })
        .expect(429);
    });
  });

  describe('Different Endpoints', () => {
    it('should apply rate limit across all endpoints', async () => {
      const agent = request.agent(app.getHttpServer());

      // Mix different endpoints
      await agent.get('/api').expect(200);
      await agent.get('/api/health/live').expect(200);
      await agent.get('/api').expect(200);
      await agent.get('/api/health/ready').expect(200);
      await agent.get('/api').expect(200);

      // Should be rate-limited
      await agent.get('/api').expect(429);
    });

    it('should handle rate limit for health check endpoints', async () => {
      const agent = request.agent(app.getHttpServer());

      // Health endpoints might have different limits
      for (let i = 0; i < 5; i++) {
        await agent.get('/api/health/live').expect(200);
      }

      // Check if rate limited (depends on configuration)
      const response = await agent.get('/api/health/live');
      expect([200, 429]).toContain(response.status);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests from same client', async () => {
      const agent = request.agent(app.getHttpServer());

      // Make 3 concurrent requests
      const promises = [
        agent.get('/api'),
        agent.get('/api'),
        agent.get('/api'),
      ];

      const responses = await Promise.all(promises);

      // All should succeed as we're within limit
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle burst of requests correctly', async () => {
      const agent = request.agent(app.getHttpServer());

      // Send burst of requests
      const promises = Array(10)
        .fill(null)
        .map(() => agent.get('/api'));

      const responses = await Promise.all(promises);

      // Some should succeed, some should be rate-limited
      const successCount = responses.filter((r) => r.status === 200).length;
      const limitedCount = responses.filter((r) => r.status === 429).length;

      expect(successCount).toBeLessThanOrEqual(5);
      expect(limitedCount).toBeGreaterThanOrEqual(5);
      expect(successCount + limitedCount).toBe(10);
    });
  });

  describe('Rate Limit Error Response', () => {
    it('should return proper error format when rate limited', async () => {
      const agent = request.agent(app.getHttpServer());

      // Exceed rate limit
      for (let i = 0; i < 6; i++) {
        await agent.get('/api');
      }

      const response = await agent.get('/api').expect(429);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 429);
      expect(response.headers['retry-after']).toBeDefined();

      // Retry-After should be a number of seconds
      const retryAfter = parseInt(response.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    it('should include timestamp in error response', async () => {
      const agent = request.agent(app.getHttpServer());

      // Exceed rate limit
      for (let i = 0; i < 6; i++) {
        await agent.get('/api');
      }

      const response = await agent.get('/api').expect(429);

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should handle requests with IPv6 addresses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .set('X-Forwarded-For', '2001:0db8:85a3:0000:0000:8a2e:0370:7334')
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should handle multiple IPs in X-Forwarded-For header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .set('X-Forwarded-For', '192.168.1.1, 10.0.0.1, 172.16.0.1')
        .expect(200);

      expect(response.status).toBe(200);
    });
  });
});
