import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../generated/prisma';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    name: process.env.DATABASE_NAME || 'myapp',
  };
}

function buildDatabaseUrl(config: DatabaseConfig): string {
  return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.name}`;
}

async function checkDatabaseConnection() {
  const config = getDatabaseConfig();
  const databaseUrl = buildDatabaseUrl(config);

  console.log('🔍 Checking database connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Database: ${config.name}`);
  console.log(`  User: ${config.username}`);
  console.log('');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Test query
    const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
    console.log(`✅ Query test successful! Server time: ${result[0].now}`);

    // Get database version
    const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    console.log(`\nDatabase version:`);
    console.log(`  ${versionResult[0].version.split('\n')[0]}`);

    await prisma.$disconnect();
    console.log('\n✅ All database checks passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('\nError details:');
    if (error instanceof Error) {
      console.error(`  ${error.message}`);

      // Provide helpful suggestions
      console.error('\n💡 Suggestions:');
      console.error('  1. Ensure PostgreSQL is running');
      console.error('  2. Check your .env file configuration');
      console.error('  3. Verify database credentials');
      console.error('  4. Ensure the database exists');
      console.error(`  5. Try: createdb ${config.name}`);
    } else {
      console.error(error);
    }

    await prisma.$disconnect();
    process.exit(1);
  }
}

checkDatabaseConnection();
