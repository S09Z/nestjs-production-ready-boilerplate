import databaseConfig from './database.config';

describe('DatabaseConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default values when environment variables are not set', () => {
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.DATABASE_USER;
    delete process.env.DATABASE_PASSWORD;
    delete process.env.DATABASE_NAME;
    delete process.env.DATABASE_SYNC;
    delete process.env.DATABASE_LOGGING;

    const config = databaseConfig();

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.username).toBe('postgres');
    expect(config.password).toBeUndefined();
    expect(config.name).toBe('myapp');
    expect(config.synchronize).toBe(false);
    expect(config.logging).toBe(false);
  });

  it('should use environment variables when set', () => {
    process.env.DATABASE_HOST = 'db.example.com';
    process.env.DATABASE_PORT = '3306';
    process.env.DATABASE_USER = 'testuser';
    process.env.DATABASE_PASSWORD = 'testpass';
    process.env.DATABASE_NAME = 'testdb';
    process.env.DATABASE_SYNC = 'true';
    process.env.DATABASE_LOGGING = 'true';

    const config = databaseConfig();

    expect(config.host).toBe('db.example.com');
    expect(config.port).toBe(3306);
    expect(config.username).toBe('testuser');
    expect(config.password).toBe('testpass');
    expect(config.name).toBe('testdb');
    expect(config.synchronize).toBe(true);
    expect(config.logging).toBe(true);
  });

  it('should parse port as integer', () => {
    process.env.DATABASE_PORT = '5433';

    const config = databaseConfig();

    expect(config.port).toBe(5433);
    expect(typeof config.port).toBe('number');
  });

  it('should handle invalid port gracefully', () => {
    process.env.DATABASE_PORT = 'invalid';

    const config = databaseConfig();

    expect(config.port).toBeNaN();
  });

  it('should parse synchronize as boolean', () => {
    process.env.DATABASE_SYNC = 'true';
    expect(databaseConfig().synchronize).toBe(true);

    process.env.DATABASE_SYNC = 'false';
    expect(databaseConfig().synchronize).toBe(false);

    process.env.DATABASE_SYNC = 'anything';
    expect(databaseConfig().synchronize).toBe(false);
  });

  it('should parse logging as boolean', () => {
    process.env.DATABASE_LOGGING = 'true';
    expect(databaseConfig().logging).toBe(true);

    process.env.DATABASE_LOGGING = 'false';
    expect(databaseConfig().logging).toBe(false);

    process.env.DATABASE_LOGGING = 'anything';
    expect(databaseConfig().logging).toBe(false);
  });

  it('should handle empty password', () => {
    process.env.DATABASE_PASSWORD = '';

    const config = databaseConfig();

    expect(config.password).toBe('');
  });
});
