import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../src/database/database.service';
import { DatabaseModule } from '../src/database/database.module';
import databaseConfig from '../src/config/database.config';

describe('Database Connection (e2e)', () => {
  let app: TestingModule;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [databaseConfig],
          envFilePath: '.env.test',
        }),
        DatabaseModule,
      ],
    }).compile();

    databaseService = app.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    await databaseService.$disconnect();
    await app.close();
  });

  describe('Database Connection', () => {
    it('should connect to the database', async () => {
      await expect(databaseService.$connect()).resolves.not.toThrow();
    });

    it('should execute a simple query', async () => {
      const result = await databaseService.$queryRaw<Array<{ result: number }>>`
        SELECT 1 as result
      `;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].result).toBe(1);
    });

    it('should check connection health', async () => {
      const isHealthy = await databaseService.checkConnection();

      expect(isHealthy).toBe(true);
    });

    it('should return database info', () => {
      const info = databaseService.getDatabaseInfo();

      expect(info).toHaveProperty('host');
      expect(info).toHaveProperty('port');
      expect(info).toHaveProperty('database');
      expect(info).toHaveProperty('user');
      expect(typeof info.port).toBe('number');
    });

    it('should get current timestamp from database', async () => {
      const result = await databaseService.$queryRaw<Array<{ now: Date }>>`
        SELECT NOW() as now
      `;

      expect(result[0].now).toBeInstanceOf(Date);
    });

    it('should handle multiple concurrent queries', async () => {
      const queries = Array.from({ length: 5 }, (_, i) =>
        databaseService.$queryRaw`SELECT ${i} as value`,
      );

      await expect(Promise.all(queries)).resolves.not.toThrow();
    });
  });

  describe('Database Error Handling', () => {
    it('should handle invalid query gracefully', async () => {
      await expect(
        databaseService.$queryRawUnsafe('SELECT * FROM non_existent_table'),
      ).rejects.toThrow();
    });
  });

  describe('Transaction Support', () => {
    it('should support transactions', async () => {
      await expect(
        databaseService.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT 1`;
          return true;
        }),
      ).resolves.toBe(true);
    });

    it('should rollback on error', async () => {
      await expect(
        databaseService.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT 1`;
          throw new Error('Test rollback');
        }),
      ).rejects.toThrow('Test rollback');
    });
  });
});
