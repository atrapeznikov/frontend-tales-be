import { randomBytes } from 'crypto';
import type { Request } from 'express';
import { RedisService } from '../../redis';

type StoreCallback = (err: Error | null, state?: string) => void;
type VerifyCallback = (
  err: Error | null,
  ok?: boolean,
  state?: { message: string } | string,
) => void;

/**
 * CSRF protection for the OAuth2 authorization-code flow.
 *
 * passport-oauth2 (and the google/github/yandex strategies built on it) call
 * `store()` when building the authorization redirect and `verify()` on the
 * callback. The default behaviour requires express-session; this implementation
 * instead binds the `state` nonce to two independent channels:
 *
 *   1. A single-use random handle persisted in Redis with a short TTL.
 *   2. An httpOnly, SameSite=Lax cookie set on the user's browser.
 *
 * On callback both must match (and the Redis entry must still exist and is then
 * consumed), which prevents login-CSRF / forced account-linking: an attacker
 * cannot mint a state that is simultaneously present in our Redis store and in
 * the victim's cookie jar.
 */
export class OAuthStateStore {
  private readonly ttlSeconds = 600; // 10 minutes to complete the flow
  private readonly cookieName = 'oauth_state';

  constructor(private readonly redis: RedisService) {}

  store(req: Request, _meta: unknown, callback: StoreCallback): void {
    const handle = randomBytes(24).toString('hex');

    this.redis
      .set(`oauth:state:${handle}`, '1', this.ttlSeconds)
      .then(() => {
        // req.res is the Express response; cookie-parser is already enabled.
        req.res?.cookie(this.cookieName, handle, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax', // must survive the top-level redirect back from the IdP
          maxAge: this.ttlSeconds * 1000,
          path: '/api/auth',
        });
        callback(null, handle);
      })
      .catch((err: unknown) =>
        callback(err instanceof Error ? err : new Error(String(err))),
      );
  }

  verify(req: Request, providedState: string, callback: VerifyCallback): void {
    const cookieState = (req.cookies as Record<string, string> | undefined)?.[
      this.cookieName
    ];

    // Clear the cookie regardless of outcome.
    req.res?.clearCookie(this.cookieName, { path: '/api/auth' });

    if (!providedState || !cookieState || providedState !== cookieState) {
      callback(null, false, { message: 'Invalid OAuth state parameter.' });
      return;
    }

    const key = `oauth:state:${providedState}`;
    this.redis
      .get(key)
      .then(async (val) => {
        if (!val) {
          callback(null, false, { message: 'OAuth state expired or unknown.' });
          return;
        }
        // Single-use: consume the handle so it can't be replayed.
        await this.redis.del(key);
        callback(null, true);
      })
      .catch((err: unknown) =>
        callback(err instanceof Error ? err : new Error(String(err))),
      );
  }
}
