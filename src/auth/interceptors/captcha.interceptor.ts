import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { CaptchaService } from '../captcha/captcha.service';

/**
 * Verifies the Yandex SmartCaptcha token submitted with a login request.
 *
 * Runs before the handler — if the token is missing or invalid, the request
 * is rejected with 403 and the real login logic never executes. If the server
 * has no captcha secret configured, verification is skipped (dev bypass).
 */
@Injectable()
export class CaptchaInterceptor implements NestInterceptor {
  constructor(private readonly captchaService: CaptchaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();

    const body = req.body as { captchaToken?: unknown } | undefined;
    const token =
      typeof body?.captchaToken === 'string' ? body.captchaToken : undefined;

    const ip = this.extractIp(req);

    const ok = await this.captchaService.verify(token, ip);
    if (!ok) {
      throw new ForbiddenException('Captcha verification failed');
    }

    return next.handle();
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]!.trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }
}
