import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';

// Yandex OAuth2 uses a standard OAuth2 flow
@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID:
        configService.get<string>('YANDEX_CLIENT_ID') || 'dummy-client-id',
      clientSecret:
        configService.get<string>('YANDEX_CLIENT_SECRET') ||
        'dummy-client-secret',
      callbackURL:
        configService.get<string>('YANDEX_CALLBACK_URL') ||
        'http://localhost:3000/api/auth/yandex/callback',
      authorizationURL: 'https://oauth.yandex.ru/authorize',
      tokenURL: 'https://oauth.yandex.ru/token',
      scope: (() => {
        const scopes = configService.get<string>('YANDEX_SCOPES');
        return scopes
          ? scopes.split(',').map((s) => s.trim())
          : ['login:email', 'login:info', 'login:avatar'];
      })(),
      // NOTE: state parameter requires express-session. The single-use OAuth
      // authorization code pattern (60s TTL) partially mitigates OAuth CSRF.
    });
  }

  userProfile(
    accessToken: string,
    done: (err: any, profile?: any) => void,
  ): void {
    fetch('https://login.yandex.ru/info?format=json', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            throw new Error(`Yandex API returned ${res.status}: ${text}`);
          });
        }
        return res.json();
      })
      .then((json) => {
        const profile = {
          id: json.id,
          displayName: json.display_name || json.real_name || json.login,
          emails: json.default_email ? [{ value: json.default_email }] : [],
          photos: json.default_avatar_id
            ? [
                {
                  value: `https://avatars.yandex.net/get-yapic/${json.default_avatar_id}/islands-200`,
                },
              ]
            : [],
          _raw: JSON.stringify(json),
          _json: json,
        };
        done(null, profile);
      })
      .catch((err) => {
        done(err);
      });
  }

  async validate(
    accessToken: string,
    refreshToken: string,

    profile: any,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Yandex account has no email'), undefined);
      return;
    }

    const user = await this.usersService.findOrCreateByOAuth({
      provider: 'YANDEX',
      providerAccountId: profile.id,
      email,
      displayName: profile.displayName || email,
      avatarUrl: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    });

    done(null, user);
  }
}
