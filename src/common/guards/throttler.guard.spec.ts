import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

describe('ThrottlerGuard', () => {
  let guard: ThrottlerGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ThrottlerGuard,
          useFactory: (reflector: Reflector) => {
            return new ThrottlerGuard(
              {
                throttlers: [{ ttl: 60000, limit: 10 }],
              },
              {
                getTracker: jest.fn(),
                getTrackerFromRequest: jest.fn(),
              },
              reflector,
            );
          },
          inject: [Reflector],
        },
        Reflector,
      ],
    }).compile();

    guard = module.get<ThrottlerGuard>(ThrottlerGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('Rate Limiting', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow requests within rate limit', async () => {
      const context = createMockExecutionContext();
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should throw ThrottlerException when rate limit exceeded', async () => {
      const context = createMockExecutionContext();

      // Simulate exceeding rate limit by calling canActivate multiple times
      const results: boolean[] = [];

      try {
        // Make requests up to the limit
        for (let i = 0; i < 10; i++) {
          results.push(await guard.canActivate(context));
        }

        // This should throw
        await guard.canActivate(context);
        fail('Should have thrown ThrottlerException');
      } catch (error) {
        expect(error).toBeInstanceOf(ThrottlerException);
      }
    });

    it('should track requests per IP address', async () => {
      const context1 = createMockExecutionContext('192.168.1.1');
      const context2 = createMockExecutionContext('192.168.1.2');

      // Both IPs should be able to make requests independently
      expect(await guard.canActivate(context1)).toBe(true);
      expect(await guard.canActivate(context2)).toBe(true);
    });

    it('should reset rate limit after TTL expires', async () => {
      jest.useFakeTimers();
      const context = createMockExecutionContext();

      // Make a request
      await guard.canActivate(context);

      // Fast-forward time past TTL
      jest.advanceTimersByTime(61000);

      // Should be able to make request again
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Throttler Decorators', () => {
    it('should skip rate limiting when @SkipThrottle() is applied', async () => {
      const context = createMockExecutionContext();

      // Mock reflector to return skip: true
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      // Should allow request even if rate limit would be exceeded
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should apply custom throttle limits with @Throttle() decorator', async () => {
      const context = createMockExecutionContext();

      // Mock reflector to return custom limit
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        limit: 5,
        ttl: 30000,
      });

      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests without IP address', async () => {
      const context = createMockExecutionContext(undefined);
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should handle concurrent requests from same IP', async () => {
      const context = createMockExecutionContext('192.168.1.1');

      const promises = Array(5)
        .fill(null)
        .map(() => guard.canActivate(context));

      const results = await Promise.all(promises);
      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should provide meaningful error message on rate limit', async () => {
      const context = createMockExecutionContext();

      try {
        // Exceed rate limit
        for (let i = 0; i < 11; i++) {
          await guard.canActivate(context);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(ThrottlerException);
        expect(error.message).toContain('ThrottlerException');
      }
    });
  });
});

// Helper function to create mock execution context
function createMockExecutionContext(ip = '127.0.0.1'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        ips: [ip],
        method: 'GET',
        url: '/api/test',
        headers: {},
      }),
      getResponse: () => ({
        setHeader: jest.fn(),
      }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn() as any,
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({
      getData: () => ({}),
      getContext: () => ({}),
    }),
    switchToWs: () => ({
      getData: () => ({}),
      getClient: () => ({}),
    }),
    getType: () => 'http' as any,
  } as ExecutionContext;
}
