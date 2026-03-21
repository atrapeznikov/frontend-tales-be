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
    // GoogleStrategy,
    // GithubStrategy,
    // YandexStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
