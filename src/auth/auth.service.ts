import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis.service.js';
import { EmailService } from '../email/index.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { TokensDto } from './dto/tokens.dto.js';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  // Standard JWT claim (seconds since epoch), populated by the signer.
  iat?: number;
}

/**
 * Redis key holding the cutoff time (epoch seconds). Any access token whose
 * `iat` is older than this value is treated as revoked. Set on logout so an
 * already-issued access token can't be used after the user logs out.
 */
export const tokenRevokeKey = (userId: string): string =>
  `auth:revoke-before:${userId}`;

interface UserEntity {
  id: string;
  email: string;
  role: string;
  displayName: string;
  nickname: string | null;
  passwordHash: string | null;
  avatarUrl: string | null;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto, lang?: 'en' | 'ru'): Promise<TokensDto> {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      nickname: dto.nickname,
    });

    const targetLang = lang || dto.lang;

    this.emailService
      .sendWelcomeEmail(user.email, user.displayName, targetLang)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to send welcome email to ${user.email}: ${msg}`,
        );
      });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<TokensDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('User is blocked');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.avatarUrl) {
      const defaultAvatar = this.usersService.getRandomDefaultAvatar();
      const updatedUser = await this.usersService.updateAvatarUrl(user.id, defaultAvatar);
      return this.generateTokens(updatedUser);
    }

    return this.generateTokens(user);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokensDto> {
    const storedHash = await this.redisService.get(`user:session:${userId}`);

    if (!storedHash) {
      throw new ForbiddenException('Session expired');
    }

    const isValid = await bcrypt.compare(refreshToken, storedHash);
    if (!isValid) {
      await this.redisService.del(`user:session:${userId}`);
      throw new ForbiddenException('Invalid refresh token');
    }

    const user = await this.usersService.findByIdOrThrow(userId);
    if (user.isBlocked) {
      throw new ForbiddenException('User is blocked');
    }
    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.del(`user:session:${userId}`);

    // Revoke any access tokens already issued to this user. We store the
    // current time; JwtStrategy rejects tokens with an older `iat`. The key
    // only needs to outlive the access-token lifetime, after which `exp`
    // enforcement takes over.
    const accessTtl = this.parseDurationSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
      900,
    );
    await this.redisService.set(
      tokenRevokeKey(userId),
      String(Math.floor(Date.now() / 1000)),
      accessTtl,
    );

    this.logger.log(`User ${userId} logged out`);
  }

  /**
   * Parses a JWT-style duration ('15m', '7d', '3600', '2h') into seconds.
   * Falls back to `fallback` for unrecognised/empty input.
   */
  private parseDurationSeconds(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
    if (!match) return fallback;
    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return amount * multipliers[unit];
  }

  async setupNickname(userId: string, nickname: string): Promise<TokensDto> {
    const user = await this.usersService.updateNickname(userId, nickname);
    return this.generateTokens(user);
  }

  /**
   * Creates a single-use, short-lived authorization code for OAuth callbacks.
   * The code is stored in Redis and expires in 60 seconds.
   */
  async createOAuthCode(userId: string): Promise<string> {
    const code = uuid();
    await this.redisService.set(`oauth:code:${code}`, userId, 60);
    return code;
  }

  /**
   * Exchanges an authorization code for tokens. The code is deleted after use
   * to prevent replay attacks.
   */
  async exchangeOAuthCode(code: string): Promise<TokensDto> {
    const userId = await this.redisService.get(`oauth:code:${code}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired authorization code');
    }

    // Delete the code immediately (single-use)
    await this.redisService.del(`oauth:code:${code}`);

    const user = await this.usersService.findByIdOrThrow(userId);
    if (user.isBlocked) {
      throw new UnauthorizedException('User is blocked');
    }
    return this.generateTokens(user);
  }

  async generateTokens(user: UserEntity): Promise<TokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessOpts: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    };

    const refreshOpts: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessOpts),
      this.jwtService.signAsync(payload, refreshOpts),
    ]);

    // Store refresh token hash in Redis
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
    await this.redisService.set(
      `user:session:${user.id}`,
      refreshTokenHash,
      ttlSeconds,
    );

    return { accessToken, refreshToken };
  }
}
