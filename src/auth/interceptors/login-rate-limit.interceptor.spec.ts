import {
  CallHandler,
  ExecutionContext,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { LoginRateLimitInterceptor } from './login-rate-limit.interceptor.js';
import { RedisService } from '../../redis/redis.service.js';

describe('LoginRateLimitInterceptor', () => {
  let interceptor: LoginRateLimitInterceptor;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    incrWithTtl: jest.Mock;
    getClient: jest.Mock;
    ttl: jest.Mock;
  };

  const buildContext = (req: any, res: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(undefined),
      incrWithTtl: jest.fn().mockResolvedValue({ value: 1, ttl: 900 }),
      ttl: jest.fn().mockResolvedValue(120),
      getClient: jest.fn(),
    };
    redis.getClient.mockReturnValue({ ttl: redis.ttl });

    interceptor = new LoginRateLimitInterceptor(
      redis as unknown as RedisService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should allow request when counters are under limit and clear counters on success', async () => {
    redis.get.mockResolvedValue(null);
    const handler: CallHandler = { handle: jest.fn(() => of('result')) };
    const res = { setHeader: jest.fn() };
    const ctx = buildContext(
      { ip: '1.2.3.4', body: { email: 'A@B.com' } },
      res,
    );

    const obs = await interceptor.intercept(ctx, handler);
    const value = await lastValueFrom(obs);

    expect(value).toBe('result');
    expect(redis.del).toHaveBeenCalledWith('login:fail:ip:1.2.3.4');
    expect(redis.del).toHaveBeenCalledWith('login:fail:email:a@b.com');
  });

  it('should block when ip counter exceeds limit', async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === 'login:fail:ip:1.2.3.4') return Promise.resolve('10');
      return Promise.resolve(null);
    });
    redis.ttl.mockResolvedValue(900);
    const handler: CallHandler = { handle: jest.fn(() => of('ok')) };
    const res = { setHeader: jest.fn() };
    const ctx = buildContext(
      { ip: '1.2.3.4', body: { email: 'a@b.com' } },
      res,
    );

    await expect(interceptor.intercept(ctx, handler)).rejects.toThrow(
      HttpException,
    );
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '900');
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('should block when email counter exceeds limit', async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === 'login:fail:email:a@b.com') return Promise.resolve('5');
      return Promise.resolve(null);
    });
    redis.ttl.mockResolvedValue(120);
    const handler: CallHandler = { handle: jest.fn(() => of('ok')) };
    const res = { setHeader: jest.fn() };
    const ctx = buildContext(
      { ip: '1.2.3.4', body: { email: 'a@b.com' } },
      res,
    );

    await expect(interceptor.intercept(ctx, handler)).rejects.toThrow(
      HttpException,
    );
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '120');
  });

  it('should increment failure counters when handler throws UnauthorizedException', async () => {
    redis.get.mockResolvedValue(null);
    const handler: CallHandler = {
      handle: jest.fn(() => throwError(() => new UnauthorizedException())),
    };
    const ctx = buildContext(
      { ip: '1.2.3.4', body: { email: 'a@b.com' } },
      { setHeader: jest.fn() },
    );

    const obs = await interceptor.intercept(ctx, handler);
    await expect(lastValueFrom(obs)).rejects.toThrow(UnauthorizedException);

    expect(redis.incrWithTtl).toHaveBeenCalledWith(
      'login:fail:ip:1.2.3.4',
      900,
    );
    expect(redis.incrWithTtl).toHaveBeenCalledWith(
      'login:fail:email:a@b.com',
      900,
    );
  });

  it('should not increment counters for non-Unauthorized errors', async () => {
    redis.get.mockResolvedValue(null);
    const handler: CallHandler = {
      handle: jest.fn(() => throwError(() => new Error('boom'))),
    };
    const ctx = buildContext(
      { ip: '1.2.3.4', body: { email: 'a@b.com' } },
      { setHeader: jest.fn() },
    );

    const obs = await interceptor.intercept(ctx, handler);
    await expect(lastValueFrom(obs)).rejects.toThrow('boom');
    expect(redis.incrWithTtl).not.toHaveBeenCalled();
  });

  it('should treat missing email gracefully and skip email counter', async () => {
    redis.get.mockResolvedValue(null);
    const handler: CallHandler = { handle: jest.fn(() => of('ok')) };
    const res = { setHeader: jest.fn() };
    const ctx = buildContext({ ip: '1.2.3.4', body: {} }, res);

    const obs = await interceptor.intercept(ctx, handler);
    await lastValueFrom(obs);

    expect(redis.del).toHaveBeenCalledWith('login:fail:ip:1.2.3.4');
    expect(
      redis.del.mock.calls.some((c) =>
        String(c[0]).startsWith('login:fail:email:'),
      ),
    ).toBe(false);
  });

  it("should fall back to 'unknown' when ip and socket are missing", async () => {
    redis.get.mockResolvedValue(null);
    const handler: CallHandler = { handle: jest.fn(() => of('ok')) };
    const ctx = buildContext({ body: {} }, { setHeader: jest.fn() });

    const obs = await interceptor.intercept(ctx, handler);
    await lastValueFrom(obs);

    expect(redis.del).toHaveBeenCalledWith('login:fail:ip:unknown');
  });

  it('should ignore non-string email in body', async () => {
    redis.get.mockResolvedValue(null);
    const handler: CallHandler = { handle: jest.fn(() => of('ok')) };
    const ctx = buildContext(
      { ip: '1.2.3.4', body: { email: 123 } },
      { setHeader: jest.fn() },
    );

    const obs = await interceptor.intercept(ctx, handler);
    await lastValueFrom(obs);
    expect(
      redis.del.mock.calls.some((c) =>
        String(c[0]).startsWith('login:fail:email:'),
      ),
    ).toBe(false);
  });

  it('should ignore empty email after trimming', async () => {
    redis.get.mockResolvedValue(null);
    const handler: CallHandler = { handle: jest.fn(() => of('ok')) };
    const ctx = buildContext(
      { ip: '1.2.3.4', body: { email: '   ' } },
      { setHeader: jest.fn() },
    );

    const obs = await interceptor.intercept(ctx, handler);
    await lastValueFrom(obs);
    expect(
      redis.del.mock.calls.some((c) =>
        String(c[0]).startsWith('login:fail:email:'),
      ),
    ).toBe(false);
  });
});
