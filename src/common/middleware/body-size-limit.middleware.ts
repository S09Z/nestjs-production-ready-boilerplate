import {
  Injectable,
  NestMiddleware,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BodySizeLimitMiddleware implements NestMiddleware {
  // Default limit: 10MB
  private readonly defaultLimit = 10 * 1024 * 1024;

  constructor(private readonly maxSize?: number) {}

  use(req: Request, res: Response, next: NextFunction) {
    const limit = this.maxSize || this.defaultLimit;
    let receivedBytes = 0;

    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;

      if (receivedBytes > limit) {
        req.pause();
        throw new PayloadTooLargeException(
          `Request body too large. Maximum size is ${this.formatBytes(limit)}`,
        );
      }
    });

    req.on('end', () => {
      next();
    });

    req.on('error', (error) => {
      next(error);
    });

    // If no data event (e.g., GET request), proceed immediately
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
      next();
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  }
}
