import { ConfigService } from '@nestjs/config';

const ioredisInstance = {
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
  multi: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ioredisInstance);
});

import Redis from 'ioredis';
import { RedisService } from './redis.service.js';

describe('RedisService', () => {
  let service: RedisService;
  const configService = {
    get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: 'pw',
      };
      return key in map ? map[key] : fallback;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RedisService(configService);
  });

  describe('constructor', () => {
    it('should initialize Redis with config and register listeners', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
          password: 'pw',
        }),
      );
      expect(ioredisInstance.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(ioredisInstance.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('should omit password when not configured', () => {
      jest.clearAllMocks();
      const cs = {
        get: jest.fn().mockImplementation((key: string, fb?: unknown) => {
          if (key === 'REDIS_PASSWORD') return undefined;
          if (key === 'REDIS_HOST') return 'localhost';
          if (key === 'REDIS_PORT') return 6379;
          return fb;
        }),
      } as unknown as ConfigService;

      // eslint-disable-next-line no-new
      new RedisService(cs);

      const args = (Redis as jest.Mock).mock.calls[0][0];
      expect(args).not.toHaveProperty('password');
    });

    it('should log on connect event and on error event', () => {
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => undefined);
      const errorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      const onCalls = ioredisInstance.on.mock.calls;
      const connectCb = onCalls.find((c) => c[0] === 'connect')![1];
      const errorCb = onCalls.find((c) => c[0] === 'error')![1];

      connectCb();
      errorCb({ message: 'boom' });

      expect(logSpy).toHaveBeenCalledWith('Connected to Redis');
      expect(errorSpy).toHaveBeenCalledWith('Redis error: boom');
    });
  });

  describe('getClient', () => {
    it('should return underlying ioredis instance', () => {
      expect(service.getClient()).toBe(ioredisInstance);
    });
  });

  describe('get', () => {
    it('should delegate to client.get', async () => {
      ioredisInstance.get.mockResolvedValue('value');
      const result = await service.get('key');
      expect(ioredisInstance.get).toHaveBeenCalledWith('key');
      expect(result).toBe('value');
    });
  });

  describe('set', () => {
    it('should set with TTL when ttl provided', async () => {
      await service.set('k', 'v', 60);
      expect(ioredisInstance.set).toHaveBeenCalledWith('k', 'v', 'EX', 60);
    });

    it('should set without TTL when not provided', async () => {
      await service.set('k', 'v');
      expect(ioredisInstance.set).toHaveBeenCalledWith('k', 'v');
    });

    it('should set without TTL when ttlSeconds is 0 (falsy)', async () => {
      await service.set('k', 'v', 0);
      expect(ioredisInstance.set).toHaveBeenCalledWith('k', 'v');
    });
  });

  describe('del', () => {
    it('should delegate to client.del', async () => {
      await service.del('k');
      expect(ioredisInstance.del).toHaveBeenCalledWith('k');
    });
  });

  describe('incrWithTtl', () => {
    it('should run a pipeline and return value and ttl', async () => {
      const pipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 3],
          [null, 1],
          [null, 600],
        ]),
      };
      ioredisInstance.multi.mockReturnValue(pipeline);

      const result = await service.incrWithTtl('k', 600);

      expect(pipeline.incr).toHaveBeenCalledWith('k');
      expect(pipeline.expire).toHaveBeenCalledWith('k', 600, 'NX');
      expect(pipeline.ttl).toHaveBeenCalledWith('k');
      expect(result).toEqual({ value: 3, ttl: 600 });
    });

    it('should return zeros when pipeline.exec returns null', async () => {
      const pipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      ioredisInstance.multi.mockReturnValue(pipeline);

      const result = await service.incrWithTtl('k', 600);
      expect(result).toEqual({ value: 0, ttl: -2 });
    });
  });

  describe('delByPattern', () => {
    it('should delete all matching keys', async () => {
      ioredisInstance.keys.mockResolvedValue(['a', 'b']);
      await service.delByPattern('articles:*');
      expect(ioredisInstance.keys).toHaveBeenCalledWith('articles:*');
      expect(ioredisInstance.del).toHaveBeenCalledWith('a', 'b');
    });

    it('should not call del when no matching keys', async () => {
      ioredisInstance.keys.mockResolvedValue([]);
      await service.delByPattern('none:*');
      expect(ioredisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit the redis client', async () => {
      ioredisInstance.quit.mockResolvedValue('OK');
      await service.onModuleDestroy();
      expect(ioredisInstance.quit).toHaveBeenCalled();
    });
  });
});
