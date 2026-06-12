import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { RedisService } from '../../redis';
import { OAuthStateStore } from './oauth-state.store.js';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
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
        configService.get<string>('GITHUB_CLIENT_ID') || 'dummy-client-id',
      clientSecret:
        configService.get<string>('GITHUB_CLIENT_SECRET') ||
        'dummy-client-secret',
      callbackURL:
        configService.get<string>('GITHUB_CALLBACK_URL') ||
        'http://localhost:3000/api/auth/github/callback',
      scope: ['user:email'],
      state: true,
      store: new OAuthStateStore(redisService),
    };
    super(options as unknown as ConstructorParameters<typeof Strategy>[0]);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(
        new Error(
          'GitHub account has no public email. Please set one in GitHub settings.',
        ),
        undefined,
      );
      return;
    }

    const user = await this.usersService.findOrCreateByOAuth({
      provider: 'GITHUB',
      providerAccountId: profile.id,
      email,
      displayName: profile.displayName || profile.username || email,
      avatarUrl: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    });

    done(null, user);
  }
}
