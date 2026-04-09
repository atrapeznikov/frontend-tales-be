import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  JwtStrategy,
  JwtRefreshStrategy,
  GoogleStrategy,
  GithubStrategy,
  YandexStrategy,
} from './strategies';
import { LoginRateLimitInterceptor, CaptchaInterceptor } from './interceptors';
import { CaptchaService } from './captcha';
import { UsersModule } from '../users';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    LoginRateLimitInterceptor,
    CaptchaInterceptor,
    CaptchaService,
    // GoogleStrategy,
    // GithubStrategy,
    // YandexStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
