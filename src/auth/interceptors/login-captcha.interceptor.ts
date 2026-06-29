import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { CaptchaService } from '../captcha/captcha.service';
import { RedisService } from '../../redis/redis.service';

/**
 * Captcha gate for the login route.
 *
 * Unlike {@link CaptchaInterceptor} (which always demands a captcha), this one
 * only requires a captcha once the caller has accumulated enough *failed* login
 * attempts — mirroring the counters maintained by `LoginRateLimitInterceptor`.
 * Honest users sail through the first few attempts captcha-free, while
 * brute-force attempts are forced to solve one before the hard rate-limit (429)
 * eventually kicks in.
 *
 * The failed-attempt counters are shared with the rate limiter, so the Redis
 * keys built here MUST stay in sync with it.
 */
@Injectable()
export class LoginCaptchaInterceptor implements NestInterceptor {
  // Number of failed attempts (per IP or email) after which a captcha becomes
  // mandatory. Overridable via CAPTCHA_AFTER_FAILURES; keep in sync with the
  // frontend's CAPTCHA_AFTER_ATTEMPTS so the widget appears exactly when the
  // server starts demanding it.
  private readonly captchaAfterFailures: number;

  constructor(
    private readonly captchaService: CaptchaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.captchaAfterFailures = this.configService.get<number>(
      'CAPTCHA_AFTER_FAILURES',
      3,
    );
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = this.extractIp(req);
    const email = this.extractEmail(req);

    if (await this.captchaRequired(ip, email)) {
      const body = req.body as { captchaToken?: unknown } | undefined;
      const token =
        typeof body?.captchaToken === 'string' ? body.captchaToken : undefined;

      const ok = await this.captchaService.verify(token, ip);
      if (!ok) {
        throw new ForbiddenException('Captcha verification failed');
      }
    }

    return next.handle();
  }

  /**
   * A captcha is required once either the per-IP or per-email failed-attempt
   * counter has reached the configured threshold. The counters reflect prior
   * attempts only — this interceptor runs before the rate limiter increments
   * the current one — so the captcha appears on the attempt *after* the
   * threshold is reached.
   */
  private async captchaRequired(
    ip: string,
    email: string | null,
  ): Promise<boolean> {
    const [ipCount, emailCount] = await Promise.all([
      this.readCount(`login:fail:ip:${ip}`),
      email ? this.readCount(`login:fail:email:${email}`) : Promise.resolve(0),
    ]);

    return (
      ipCount >= this.captchaAfterFailures ||
      emailCount >= this.captchaAfterFailures
    );
  }

  private async readCount(key: string): Promise<number> {
    const value = await this.redis.get(key);
    return value ? Number(value) : 0;
  }

  private extractIp(req: Request): string {
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  private extractEmail(req: Request): string | null {
    const body = req.body as { email?: unknown } | undefined;
    const raw = body?.email;
    if (typeof raw !== 'string') return null;
    const normalized = raw.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }
}
