import { PayloadTooLargeException } from '@nestjs/common';
import { BodySizeLimitMiddleware } from './body-size-limit.middleware';
import { Request, Response } from 'express';
import { EventEmitter } from 'events';

describe('BodySizeLimitMiddleware', () => {
  let middleware: BodySizeLimitMiddleware;
  let mockRequest: Partial<Request> & EventEmitter;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = Object.assign(new EventEmitter(), {
      method: 'POST',
      headers: {},
      pause: jest.fn(),
    });

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  describe('Default Configuration', () => {
    beforeEach(() => {
      middleware = new BodySizeLimitMiddleware();
    });

    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should allow requests within size limit', (done) => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const smallData = Buffer.alloc(1024); // 1KB
      mockRequest.emit('data', smallData);
      mockRequest.emit('end');

      setTimeout(() => {
        expect(nextFunction).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should reject requests exceeding size limit', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      // Send data larger than 10MB
      const largeChunk = Buffer.alloc(11 * 1024 * 1024); // 11MB

      expect(() => {
        mockRequest.emit('data', largeChunk);
      }).toThrow(PayloadTooLargeException);

      expect(mockRequest.pause).toHaveBeenCalled();
    });

    it('should accumulate multiple chunks and reject when total exceeds limit', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const chunk = Buffer.alloc(6 * 1024 * 1024); // 6MB each

      // First chunk should be fine
      mockRequest.emit('data', chunk);

      // Second chunk should cause total to exceed 10MB limit
      expect(() => {
        mockRequest.emit('data', chunk);
      }).toThrow(PayloadTooLargeException);
    });

    it('should provide meaningful error message with size limit', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const largeChunk = Buffer.alloc(11 * 1024 * 1024);

      try {
        mockRequest.emit('data', largeChunk);
      } catch (error) {
        expect(error).toBeInstanceOf(PayloadTooLargeException);
        expect((error as PayloadTooLargeException).message).toContain('10 MB');
      }
    });
  });

  describe('Custom Size Limit', () => {
    it('should enforce custom size limit (1MB)', () => {
      const customLimit = 1 * 1024 * 1024; // 1MB
      middleware = new BodySizeLimitMiddleware(customLimit);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const chunk = Buffer.alloc(2 * 1024 * 1024); // 2MB

      expect(() => {
        mockRequest.emit('data', chunk);
      }).toThrow(PayloadTooLargeException);
    });

    it('should allow requests within custom limit', (done) => {
      const customLimit = 5 * 1024 * 1024; // 5MB
      middleware = new BodySizeLimitMiddleware(customLimit);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const chunk = Buffer.alloc(4 * 1024 * 1024); // 4MB
      mockRequest.emit('data', chunk);
      mockRequest.emit('end');

      setTimeout(() => {
        expect(nextFunction).toHaveBeenCalled();
        done();
      }, 10);
    });
  });

  describe('HTTP Methods Without Body', () => {
    it('should skip size check for GET requests', () => {
      mockRequest.method = 'GET';
      middleware = new BodySizeLimitMiddleware();

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should skip size check for HEAD requests', () => {
      mockRequest.method = 'HEAD';
      middleware = new BodySizeLimitMiddleware();

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should skip size check for DELETE requests', () => {
      mockRequest.method = 'DELETE';
      middleware = new BodySizeLimitMiddleware();

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      middleware = new BodySizeLimitMiddleware();
    });

    it('should handle request errors gracefully', () => {
      const error = new Error('Connection error');

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      mockRequest.emit('error', error);

      expect(nextFunction).toHaveBeenCalledWith(error);
    });

    it('should pause request when size limit exceeded', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const largeChunk = Buffer.alloc(11 * 1024 * 1024);

      try {
        mockRequest.emit('data', largeChunk);
      } catch {
        // Expected
      }

      expect(mockRequest.pause).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      middleware = new BodySizeLimitMiddleware();
    });

    it('should handle empty request body', (done) => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      mockRequest.emit('end');

      setTimeout(() => {
        expect(nextFunction).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should handle exactly at the limit', (done) => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const exactLimit = Buffer.alloc(10 * 1024 * 1024); // Exactly 10MB
      mockRequest.emit('data', exactLimit);
      mockRequest.emit('end');

      setTimeout(() => {
        expect(nextFunction).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should handle multiple small chunks', (done) => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      // Send 10 chunks of 500KB each (5MB total)
      for (let i = 0; i < 10; i++) {
        const chunk = Buffer.alloc(500 * 1024);
        mockRequest.emit('data', chunk);
      }

      mockRequest.emit('end');

      setTimeout(() => {
        expect(nextFunction).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should reject when accumulated chunks exceed limit', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      // Send chunks totaling > 10MB
      const chunk = Buffer.alloc(3 * 1024 * 1024); // 3MB each

      mockRequest.emit('data', chunk);
      mockRequest.emit('data', chunk);
      mockRequest.emit('data', chunk);

      expect(() => {
        mockRequest.emit('data', chunk); // 12MB total
      }).toThrow(PayloadTooLargeException);
    });
  });

  describe('Byte Formatting', () => {
    it('should format error message with correct unit for MB', () => {
      const limit = 5 * 1024 * 1024; // 5MB
      middleware = new BodySizeLimitMiddleware(limit);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const largeChunk = Buffer.alloc(6 * 1024 * 1024);

      try {
        mockRequest.emit('data', largeChunk);
      } catch (error) {
        expect((error as PayloadTooLargeException).message).toContain('5 MB');
      }
    });

    it('should format error message with correct unit for KB', () => {
      const limit = 500 * 1024; // 500KB
      middleware = new BodySizeLimitMiddleware(limit);

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const largeChunk = Buffer.alloc(600 * 1024);

      try {
        mockRequest.emit('data', largeChunk);
      } catch (error) {
        expect((error as PayloadTooLargeException).message).toContain('500 KB');
      }
    });
  });
});
