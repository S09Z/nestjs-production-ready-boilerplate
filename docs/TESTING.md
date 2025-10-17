# Testing Guide: Rate Limiting and Large Request Handling

This guide covers the comprehensive test suite for rate limiting and large request handling in the NestJS application.

## Table of Contents

- [Overview](#overview)
- [Test Files](#test-files)
- [Running Tests](#running-tests)
- [Rate Limiting Tests](#rate-limiting-tests)
- [Large Request Tests](#large-request-tests)
- [Configuration](#configuration)
- [Best Practices](#best-practices)

## Overview

The application includes comprehensive testing for:

1. **Rate Limiting**: Protection against excessive requests from a single source
2. **Large Request Handling**: Protection against payload-based attacks

## Test Files

### Unit Tests

#### `src/common/guards/throttler.guard.spec.ts`
Tests the ThrottlerGuard functionality:
- Rate limit enforcement per IP
- TTL (Time To Live) expiration
- Custom throttle decorators (@Throttle, @SkipThrottle)
- Concurrent request handling
- Edge cases (missing IP, concurrent requests)

#### `src/common/middleware/body-size-limit.middleware.spec.ts`
Tests the BodySizeLimitMiddleware:
- Request size validation
- Custom size limits
- HTTP method handling (GET, HEAD, DELETE)
- Chunk accumulation
- Error handling

### E2E Tests

#### `test/rate-limit.e2e-spec.ts`
End-to-end tests for rate limiting:
- Request throttling across endpoints
- Rate limit header validation
- IP-based tracking
- TTL reset behavior
- Concurrent and burst requests
- Error response format

#### `test/large-request.e2e-spec.ts`
End-to-end tests for large request handling:
- Body size limit enforcement
- JSON payload validation
- File upload handling
- Query string limits
- Header size limits
- Performance and memory management

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Unit Tests Only
```bash
pnpm test -- --testPathPattern="\.spec\.ts$"
```

### Run E2E Tests Only
```bash
pnpm test:e2e
```

### Run Specific Test Suite
```bash
# Rate limiting unit tests
pnpm test -- throttler.guard.spec

# Body size middleware tests
pnpm test -- body-size-limit.middleware.spec

# Rate limiting e2e tests
pnpm test:e2e -- rate-limit.e2e-spec

# Large request e2e tests
pnpm test:e2e -- large-request.e2e-spec
```

### Run with Coverage
```bash
pnpm test:cov
```

### Watch Mode (for development)
```bash
pnpm test:watch
```

## Rate Limiting Tests

### Configuration

Rate limiting is configured via environment variables:

```env
THROTTLE_TTL=60000        # Time window in milliseconds (60 seconds)
THROTTLE_LIMIT=10         # Maximum requests per TTL
```

### Test Scenarios

#### 1. Basic Rate Limiting
```typescript
// Tests that requests within the limit are allowed
it('should allow requests within rate limit', async () => {
  for (let i = 0; i < 5; i++) {
    await request(app.getHttpServer()).get('/api').expect(200);
  }
});
```

#### 2. Rate Limit Exceeded
```typescript
// Tests that excess requests are blocked with 429 status
it('should block requests exceeding rate limit', async () => {
  // Make requests up to limit
  for (let i = 0; i < 5; i++) {
    await agent.get('/api').expect(200);
  }
  // Next request should be rate-limited
  await agent.get('/api').expect(429);
});
```

#### 3. IP-Based Tracking
```typescript
// Tests that different IPs have independent rate limits
it('should track rate limits per IP address', async () => {
  await request(app).get('/api').set('X-Forwarded-For', '192.168.1.1').expect(200);
  await request(app).get('/api').set('X-Forwarded-For', '192.168.1.2').expect(200);
});
```

#### 4. TTL Reset
```typescript
// Tests that rate limit resets after TTL expires
it('should reset rate limit after TTL expires', async () => {
  // Exceed limit
  for (let i = 0; i < 6; i++) await agent.get('/api');

  // Wait for TTL expiration
  await new Promise(resolve => setTimeout(resolve, 61000));

  // Should work again
  await agent.get('/api').expect(200);
}, 70000);
```

### Rate Limit Response Headers

The application includes these headers in responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the rate limit resets
- `Retry-After`: Seconds to wait before retrying (on 429)

### Custom Rate Limits

Use decorators to customize rate limits per endpoint:

```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

// Custom limit for specific endpoint
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Get('limited')
limitedEndpoint() {
  return 'Limited to 3 requests per minute';
}

// Skip rate limiting
@SkipThrottle()
@Get('unlimited')
unlimitedEndpoint() {
  return 'No rate limit applied';
}
```

## Large Request Tests

### Configuration

Body size limits are configured via environment variables:

```env
MAX_BODY_SIZE=10mb        # Maximum request body size
```

### Test Scenarios

#### 1. Within Size Limit
```typescript
// Tests that requests within limit are accepted
it('should accept requests within size limit', async () => {
  const payload = {
    data: 'A'.repeat(1024 * 1024) // 1MB
  };
  await request(app).post('/api/users').send(payload).expect(201);
});
```

#### 2. Exceeding Size Limit
```typescript
// Tests that oversized requests are rejected with 413
it('should reject requests exceeding size limit', async () => {
  const largePayload = {
    data: 'A'.repeat(11 * 1024 * 1024) // 11MB
  };
  await request(app).post('/api/users').send(largePayload).expect(413);
});
```

#### 3. Chunked Request Handling
```typescript
// Tests accumulation of multiple chunks
it('should accumulate chunks and reject when total exceeds limit', () => {
  const chunk = Buffer.alloc(6 * 1024 * 1024); // 6MB

  mockRequest.emit('data', chunk); // OK: 6MB

  expect(() => {
    mockRequest.emit('data', chunk); // Fail: 12MB total
  }).toThrow(PayloadTooLargeException);
});
```

#### 4. File Upload Limits
```typescript
// Tests file upload size limits
it('should reject oversized file uploads', async () => {
  const largeFile = Buffer.alloc(15 * 1024 * 1024); // 15MB

  await request(app)
    .post('/api/upload')
    .attach('file', largeFile, 'large.txt')
    .expect(413);
});
```

### HTTP Methods

The middleware handles different HTTP methods appropriately:

- **POST, PUT, PATCH**: Body size validation applied
- **GET, HEAD, DELETE**: Body size validation skipped

### Error Response Format

When a request exceeds the size limit:

```json
{
  "statusCode": 413,
  "message": "Request body too large. Maximum size is 10 MB",
  "timestamp": "2025-01-17T10:30:00.000Z"
}
```

## Configuration

### Environment Variables

Create a `.env.test` file for test-specific configuration:

```env
# Application
NODE_ENV=test
PORT=3001
API_PREFIX=api
MAX_BODY_SIZE=10mb

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# Database (test)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=test_user
DATABASE_PASSWORD=test_password
DATABASE_NAME=test_db

# Redis (test)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Test Configuration Files

#### `jest.config.js` (Unit Tests)
```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

#### `test/jest-e2e.json` (E2E Tests)
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on the state from other tests:

```typescript
beforeEach(async () => {
  // Create fresh app instance for each test
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init();
});

afterEach(async () => {
  // Clean up after each test
  await app.close();
});
```

### 2. Mock External Dependencies

Mock external services to ensure tests are fast and reliable:

```typescript
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('REDIS_CLIENT')
    .useValue(mockRedis)
    .compile();
});
```

### 3. Use Descriptive Test Names

```typescript
// Good ✅
it('should reject requests when rate limit is exceeded and return 429 status code', async () => {
  // ...
});

// Bad ❌
it('test rate limit', async () => {
  // ...
});
```

### 4. Test Edge Cases

Always test boundary conditions:

```typescript
describe('Edge Cases', () => {
  it('should handle exactly at size limit', async () => {
    const exactLimit = Buffer.alloc(10 * 1024 * 1024);
    // ...
  });

  it('should handle empty request body', async () => {
    // ...
  });

  it('should handle missing IP address', async () => {
    // ...
  });
});
```

### 5. Async Test Handling

Use proper async/await patterns and set appropriate timeouts:

```typescript
it('should reset after TTL', async () => {
  // ... test logic
  await new Promise(resolve => setTimeout(resolve, 61000));
  // ... verification
}, 70000); // Timeout set to 70 seconds
```

### 6. Coverage Goals

Aim for high test coverage:

- **Unit Tests**: 90%+ coverage
- **E2E Tests**: Cover all critical user paths
- **Integration Tests**: Test component interactions

### 7. Performance Testing

Include performance tests for critical operations:

```typescript
it('should process large request in reasonable time', async () => {
  const startTime = Date.now();

  await request(app)
    .post('/api/users')
    .send(largePayload);

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(5000); // 5 seconds max
});
```

## Debugging Tests

### Enable Debug Logging

```bash
DEBUG=* pnpm test
```

### Run Single Test

```bash
pnpm test -- --testNamePattern="should allow requests within rate limit"
```

### Inspect Test Results

```bash
pnpm test -- --verbose
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests Timeout

If tests are timing out:

1. Increase Jest timeout:
   ```typescript
   jest.setTimeout(30000); // 30 seconds
   ```

2. Check for unresolved promises
3. Ensure proper cleanup in `afterEach`/`afterAll`

### Rate Limit Tests Flaky

If rate limit tests are inconsistent:

1. Use longer TTL in tests for stability
2. Add delays between requests
3. Use test-specific rate limit configuration

### Memory Issues in Large Request Tests

If tests fail with memory errors:

1. Reduce test payload sizes
2. Force garbage collection between tests
3. Increase Node.js memory limit:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" pnpm test
   ```

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Throttler Module](https://docs.nestjs.com/security/rate-limiting)

## Contributing

When adding new tests:

1. Follow existing test patterns
2. Include unit tests for all new guards/middleware
3. Add e2e tests for user-facing features
4. Update this documentation
5. Ensure all tests pass before submitting PR

## Support

For questions or issues with tests:

1. Check existing test examples
2. Review error messages carefully
3. Consult NestJS documentation
4. Open an issue with test output
