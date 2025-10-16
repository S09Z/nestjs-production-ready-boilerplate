import { registerAs } from '@nestjs/config';

export default registerAs('health', () => ({
  memory: {
    heap: parseInt(
      process.env.HEALTH_MEMORY_HEAP ?? String(150 * 1024 * 1024),
      10,
    ),
    rss: parseInt(
      process.env.HEALTH_MEMORY_RSS ?? String(150 * 1024 * 1024),
      10,
    ),
  },
  disk: {
    thresholdPercent: parseFloat(process.env.HEALTH_DISK_THRESHOLD ?? '0.9'),
  },
}));
