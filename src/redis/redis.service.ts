import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const password = this.configService.get<string>('REDIS_PASSWORD');
    
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      ...(password ? { password } : {}),
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Atomically increments `key` and sets its TTL the first time it is
   * created. Subsequent increments within the window do not reset the TTL,
   * giving a fixed-window counter.
   *
   * @returns an object with the new value and the remaining TTL in seconds
   *          (-1 if no TTL is set, -2 if the key does not exist).
   */
  async incrWithTtl(
    key: string,
    ttlSeconds: number,
  ): Promise<{ value: number; ttl: number }> {
    const pipeline = this.client.multi();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds, 'NX');
    pipeline.ttl(key);
    const results = await pipeline.exec();

    if (!results) {
      return { value: 0, ttl: -2 };
    }

    const value = results[0]?.[1] as number;
    const ttl = results[2]?.[1] as number;
    return { value, ttl };
  }

  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Disconnected from Redis');
  }
}
