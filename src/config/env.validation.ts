import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  MAX_BODY_SIZE: Joi.string().default('10mb'),

  // CORS
  CORS_ORIGINS: Joi.string().optional(),

  // Database
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SYNC: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // Throttler
  THROTTLE_TTL: Joi.number().default(60000), // in milliseconds
  THROTTLE_LIMIT: Joi.number().default(10),

  // Health Check
  HEALTH_MEMORY_HEAP: Joi.number().default(150 * 1024 * 1024), // 150MB
  HEALTH_MEMORY_RSS: Joi.number().default(150 * 1024 * 1024), // 150MB
  HEALTH_DISK_THRESHOLD: Joi.number().min(0).max(1).default(0.9), // 90%

  // JWT (for future use)
  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRATION: Joi.string().default('1d'),
});
