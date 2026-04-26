import { CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { CaptchaInterceptor } from './captcha.interceptor.js';
import { CaptchaService } from '../captcha/captcha.service.js';

describe('CaptchaInterceptor', () => {
  let interceptor: CaptchaInterceptor;
  let captchaService: { verify: jest.Mock };

  const buildContext = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  const buildNext = (returnValue: unknown = 'ok'): CallHandler => ({
    handle: jest.fn(() => of(returnValue)),
  });

  beforeEach(() => {
    captchaService = { verify: jest.fn() };
    interceptor = new CaptchaInterceptor(
      captchaService as unknown as CaptchaService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should pass through when captcha verifies successfully', async () => {
    captchaService.verify.mockResolvedValue(true);
    const next = buildNext();
    const ctx = buildContext({
      body: { captchaToken: 'tok' },
      ip: '1.2.3.4',
    });

    const observable = await interceptor.intercept(ctx, next);

    expect(captchaService.verify).toHaveBeenCalledWith('tok', '1.2.3.4');
    expect(next.handle).toHaveBeenCalled();
    expect(observable).toBeDefined();
  });

  it('should throw ForbiddenException when verify returns false', async () => {
    captchaService.verify.mockResolvedValue(false);
    const ctx = buildContext({ body: { captchaToken: 'tok' }, ip: '1.2.3.4' });

    await expect(interceptor.intercept(ctx, buildNext())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should pass undefined token when captchaToken is not a string', async () => {
    captchaService.verify.mockResolvedValue(true);
    const ctx = buildContext({ body: { captchaToken: 123 }, ip: '1.2.3.4' });

    await interceptor.intercept(ctx, buildNext());
    expect(captchaService.verify).toHaveBeenCalledWith(undefined, '1.2.3.4');
  });

  it('should pass undefined token when body is missing', async () => {
    captchaService.verify.mockResolvedValue(true);
    const ctx = buildContext({ ip: '1.2.3.4' });

    await interceptor.intercept(ctx, buildNext());
    expect(captchaService.verify).toHaveBeenCalledWith(undefined, '1.2.3.4');
  });

  it('should fall back to socket.remoteAddress when ip is missing', async () => {
    captchaService.verify.mockResolvedValue(true);
    const ctx = buildContext({
      body: {},
      socket: { remoteAddress: '5.6.7.8' },
    });

    await interceptor.intercept(ctx, buildNext());
    expect(captchaService.verify).toHaveBeenCalledWith(undefined, '5.6.7.8');
  });

  it("should fall back to 'unknown' when no ip is available", async () => {
    captchaService.verify.mockResolvedValue(true);
    const ctx = buildContext({ body: {} });

    await interceptor.intercept(ctx, buildNext());
    expect(captchaService.verify).toHaveBeenCalledWith(undefined, 'unknown');
  });
});
