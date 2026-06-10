import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { RedisService } from '../../redis';
import { OAuthStateStore } from './oauth-state.store.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    redisService: RedisService,
  ) {
    // `store` enables a Redis + cookie-bound state store for OAuth CSRF
    // protection. It isn't part of the upstream option typings, so the options
    // are cast — passport-oauth2 supports a custom store object at runtime.
    const options = {
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') || 'dummy-client-id',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ||
        'dummy-client-secret',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
      state: true,
      store: new OAuthStateStore(redisService),
    };
    super(options as unknown as ConstructorParameters<typeof Strategy>[0]);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no email'), undefined);
      return;
    }

    const user = await this.usersService.findOrCreateByOAuth({
      provider: 'GOOGLE',
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
