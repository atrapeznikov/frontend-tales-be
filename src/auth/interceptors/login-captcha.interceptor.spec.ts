import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { LoginCaptchaInterceptor } from './login-captcha.interceptor.js';
import { CaptchaService } from '../captcha/captcha.service.js';
import { RedisService } from '../../redis/redis.service.js';

describe('LoginCaptchaInterceptor', () => {
  let interceptor: LoginCaptchaInterceptor;
  let captchaService: { verify: jest.Mock };
  let redis: { get: jest.Mock };

  const THRESHOLD = 3;

  const buildContext = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  const buildNext = (returnValue: unknown = 'ok'): CallHandler => ({
    handle: jest.fn(() => of(returnValue)),
  });

  // Returns a redis.get mock that maps full keys to failure counts.
  const redisWithCounts = (counts: Record<string, number>) =>
    jest.fn((key: string) =>
      Promise.resolve(key in counts ? String(counts[key]) : null),
    );

  beforeEach(() => {
    captchaService = { verify: jest.fn() };
    redis = { get: jest.fn().mockResolvedValue(null) };
    const config = {
      get: jest.fn().mockReturnValue(THRESHOLD),
    } as unknown as ConfigService;
    interceptor = new LoginCaptchaInterceptor(
      captchaService as unknown as CaptchaService,
      redis as unknown as RedisService,
      config,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should skip the captcha while failure counts are below the threshold', async () => {
    redis.get = redisWithCounts({ 'login:fail:email:user@example.com': 2 });
    const next = buildNext();
    const ctx = buildContext({
      body: { email: 'user@example.com', password: 'x' },
      ip: '1.2.3.4',
    });

    await interceptor.intercept(ctx, next);

    expect(captchaService.verify).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalled();
  });

  it('should require a valid captcha once the per-email threshold is reached', async () => {
    redis.get = redisWithCounts({ 'login:fail:email:user@example.com': 3 });
    captchaService.verify.mockResolvedValue(true);
    const next = buildNext();
    const ctx = buildContext({
      body: { email: 'user@example.com', password: 'x', captchaToken: 'tok' },
      ip: '1.2.3.4',
    });

    await interceptor.intercept(ctx, next);

    expect(captchaService.verify).toHaveBeenCalledWith('tok', '1.2.3.4');
    expect(next.handle).toHaveBeenCalled();
  });

  it('should require a captcha once the per-IP threshold is reached', async () => {
    redis.get = redisWithCounts({ 'login:fail:ip:1.2.3.4': 5 });
    captchaService.verify.mockResolvedValue(true);
    const ctx = buildContext({
      body: { email: 'user@example.com', password: 'x', captchaToken: 'tok' },
      ip: '1.2.3.4',
    });

    await interceptor.intercept(ctx, buildNext());

    expect(captchaService.verify).toHaveBeenCalledWith('tok', '1.2.3.4');
  });

  it('should reject with 403 when a required captcha fails verification', async () => {
    redis.get = redisWithCounts({ 'login:fail:email:user@example.com': 4 });
    captchaService.verify.mockResolvedValue(false);
    const ctx = buildContext({
      body: { email: 'user@example.com', password: 'x', captchaToken: 'bad' },
      ip: '1.2.3.4',
    });

    await expect(interceptor.intercept(ctx, buildNext())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should normalize the email when building the counter key', async () => {
    redis.get = redisWithCounts({ 'login:fail:email:user@example.com': 3 });
    captchaService.verify.mockResolvedValue(true);
    const ctx = buildContext({
      body: { email: '  USER@Example.com  ', password: 'x', captchaToken: 't' },
      ip: '1.2.3.4',
    });

    await interceptor.intercept(ctx, buildNext());

    expect(redis.get).toHaveBeenCalledWith('login:fail:email:user@example.com');
    expect(captchaService.verify).toHaveBeenCalled();
  });

  it('should pass an undefined token to verify when none is supplied', async () => {
    redis.get = redisWithCounts({ 'login:fail:ip:1.2.3.4': 3 });
    captchaService.verify.mockResolvedValue(false);
    const ctx = buildContext({
      body: { email: 'user@example.com', password: 'x' },
      ip: '1.2.3.4',
    });

    await expect(interceptor.intercept(ctx, buildNext())).rejects.toThrow(
      ForbiddenException,
    );
    expect(captchaService.verify).toHaveBeenCalledWith(undefined, '1.2.3.4');
  });

  it('should not query the email counter when no email is present', async () => {
    redis.get = jest.fn().mockResolvedValue(null);
    const ctx = buildContext({ body: { password: 'x' }, ip: '1.2.3.4' });

    await interceptor.intercept(ctx, buildNext());

    expect(redis.get).toHaveBeenCalledTimes(1);
    expect(redis.get).toHaveBeenCalledWith('login:fail:ip:1.2.3.4');
    expect(captchaService.verify).not.toHaveBeenCalled();
  });
});
