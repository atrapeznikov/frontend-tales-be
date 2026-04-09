import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, lastValueFrom } from 'rxjs';
import { RedisService } from '../../redis/redis.service';

/**
 * Rate-limits login attempts using two Redis-backed fixed-window counters:
 *
 *  - per client IP (catches a single attacker)
 *  - per email    (catches distributed attacks against one account)
 *
 * Only *failed* logins count toward the limits; successful logins reset both
 * counters. When either limit is exceeded, the interceptor short-circuits with
 * HTTP 429 and a `Retry-After` header.
 */
@Injectable()
export class LoginRateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoginRateLimitInterceptor.name);

  // Fixed window length for both counters.
  private readonly windowSeconds = 15 * 60; // 15 minutes

  // Max failed attempts per window.
  private readonly maxPerIp = 10;
  private readonly maxPerEmail = 5;

  constructor(private readonly redis: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const ip = this.extractIp(req);
    const email = this.extractEmail(req);

    const ipKey = `login:fail:ip:${ip}`;
    const emailKey = email ? `login:fail:email:${email}` : null;

    // Pre-check: block if either counter is already over the limit.
    const [ipState, emailState] = await Promise.all([
      this.redis.get(ipKey).then((v) => ({
        count: v ? Number(v) : 0,
      })),
      emailKey
        ? this.redis.get(emailKey).then((v) => ({
            count: v ? Number(v) : 0,
          }))
        : Promise.resolve({ count: 0 }),
    ]);

    if (
      ipState.count >= this.maxPerIp ||
      emailState.count >= this.maxPerEmail
    ) {
      // Use the longer of the two TTLs for Retry-After.
      const [ipTtl, emailTtl] = await Promise.all([
        this.redis.getClient().ttl(ipKey),
        emailKey ? this.redis.getClient().ttl(emailKey) : Promise.resolve(-2),
      ]);
      const retryAfter = Math.max(ipTtl, emailTtl, 1);

      res.setHeader('Retry-After', String(retryAfter));
      this.logger.warn(
        `Login rate limit hit (ip=${ip}, email=${email ?? 'n/a'}, retryAfter=${retryAfter}s)`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many login attempts. Please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Run the real handler and observe the outcome.
    return from(
      (async () => {
        try {
          const result = await lastValueFrom(next.handle());
          // Success: clear both counters so legitimate users aren't punished
          // by earlier typos.
          await Promise.all([
            this.redis.del(ipKey),
            emailKey ? this.redis.del(emailKey) : Promise.resolve(),
          ]);
          return result;
        } catch (err) {
          // Only count genuine credential failures. Validation errors (400),
          // server errors, etc. don't indicate a brute-force attempt.
          if (err instanceof UnauthorizedException) {
            await Promise.all([
              this.redis.incrWithTtl(ipKey, this.windowSeconds),
              emailKey
                ? this.redis.incrWithTtl(emailKey, this.windowSeconds)
                : Promise.resolve(),
            ]);
          }
          throw err;
        }
      })(),
    );
  }

  private extractIp(req: Request): string {
    // Honor X-Forwarded-For when behind a trusted proxy. Express already
    // populates req.ip correctly if `app.set('trust proxy', ...)` is set;
    // fall back to the raw header as a defensive default.
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]!.trim();
    }
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
