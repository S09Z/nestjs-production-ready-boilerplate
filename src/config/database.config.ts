import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  name: process.env.DATABASE_NAME || 'myapp',
  synchronize: process.env.DATABASE_SYNC === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
}));