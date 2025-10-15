import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'database.host': 'localhost',
        'database.port': 5432,
        'database.username': 'testuser',
        'database.password': 'testpass',
        'database.name': 'testdb',
        'database.logging': false,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDatabaseInfo', () => {
    it('should return database configuration info', () => {
      const info = service.getDatabaseInfo();

      expect(info).toEqual({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
      });
    });

    it('should not expose password', () => {
      const info = service.getDatabaseInfo();

      expect(info).not.toHaveProperty('password');
    });
  });

  describe('checkConnection', () => {
    it('should return true when connection is successful', async () => {
      // Mock successful query
      jest.spyOn(service, '$queryRaw').mockResolvedValue([{ result: 1 }]);

      const result = await service.checkConnection();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      // Mock failed query
      jest
        .spyOn(service, '$queryRaw')
        .mockRejectedValue(new Error('Connection failed'));

      const result = await service.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('buildDatabaseUrl', () => {
    it('should construct proper database URL', () => {
      const DatabaseServiceClass = service.constructor as any;
      const url = DatabaseServiceClass.buildDatabaseUrl(configService);

      expect(url).toBe('postgresql://testuser:testpass@localhost:5432/testdb');
    });
  });
});
