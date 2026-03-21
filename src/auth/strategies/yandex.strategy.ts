import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';

// Yandex OAuth2 uses a standard OAuth2 flow compatible with the Google strategy
// We override the authorization and token URLs to point to Yandex
@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('YANDEX_CLIENT_ID')!,
      clientSecret: configService.get<string>('YANDEX_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('YANDEX_CALLBACK_URL')!,
      authorizationURL: 'https://oauth.yandex.ru/authorize',
      tokenURL: 'https://oauth.yandex.ru/token',
      userProfileURL: 'https://login.yandex.ru/info?format=json',
      scope: ['login:email', 'login:info', 'login:avatar'],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userProfile(accessToken: string, done: (err: any, profile?: any) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any)._oauth2.get(
      'https://login.yandex.ru/info?format=json',
      accessToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any, body: string | Buffer | undefined) => {
        if (err) {
          done(err);
          return;
        }

        try {
          const json = JSON.parse(body as string);
          const profile = {
            id: json.id,
            displayName: json.display_name || json.real_name || json.login,
            emails: json.default_email
              ? [{ value: json.default_email }]
              : [],
            photos: json.default_avatar_id
              ? [
                  {
                    value: `https://avatars.yandex.net/get-yapic/${json.default_avatar_id}/islands-200`,
                  },
                ]
              : [],
            _raw: body,
            _json: json,
          };
          done(null, profile);
        } catch (e) {
          done(e);
        }
      },
    );
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
