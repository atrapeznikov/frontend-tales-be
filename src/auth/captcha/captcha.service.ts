import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface YandexValidateResponse {
  status: 'ok' | 'failed';
  message?: string;
  host?: string;
}

/**
 * Verifies Yandex SmartCaptcha tokens server-side.
 *
 * Docs: https://yandex.cloud/en/docs/smartcaptcha/concepts/validation
 *
 * If `YANDEX_CAPTCHA_SECRET` is not configured, verification is a no-op and
 * returns `true` — useful for local development without a captcha server key.
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly validateUrl =
    'https://smartcaptcha.yandexcloud.net/validate';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Returns true if the token is valid, false otherwise.
   * Also returns true when the secret is unset (dev bypass).
   */
  async verify(token: string | undefined, ip: string): Promise<boolean> {
    const secret = this.configService.get<string>('YANDEX_CAPTCHA_SECRET');

    if (!secret) {
      // Dev bypass — no secret configured.
      return true;
    }

    if (!token || typeof token !== 'string') {
      return false;
    }

    const params = new URLSearchParams({
      secret,
      token,
      ip,
    });

    try {
      const response = await fetch(`${this.validateUrl}?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        this.logger.warn(
          `Yandex captcha validate HTTP ${response.status} ${response.statusText}`,
        );
        return false;
      }

      const data = (await response.json()) as YandexValidateResponse;

      if (data.status !== 'ok') {
        this.logger.warn(
          `Captcha rejected (ip=${ip}, message=${data.message ?? 'none'})`,
        );
        return false;
      }

      return true;
    } catch (err) {
      // Fail closed on network errors — we'd rather block a login than let a
      // spoofed token through when Yandex is unreachable.
      this.logger.error(
        `Captcha verification failed (ip=${ip}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }
}
