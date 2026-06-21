import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
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
import * as crypto from 'crypto';
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

/** Redis key holding the userId for a single-use password reset token. */
export const passwordResetKey = (token: string): string =>
  `auth:password-reset:${token}`;

/** Password reset tokens are valid for 30 minutes. */
const PASSWORD_RESET_TTL_SECONDS = 30 * 60;

/** Email-verification tokens default to a 24h lifetime when not configured. */
const EMAIL_VERIFY_DEFAULT_EXPIRES_IN = '24h';

/** Payload embedded in the signed email-verification token. */
interface EmailVerifyPayload {
  sub: string;
  email: string;
  // Discriminator so a token minted for one purpose can't be replayed elsewhere.
  type: 'email-verify';
}

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

    // Fire-and-forget the verification email so a mail outage never blocks
    // (or rolls back) a successful registration.
    const verifyToken = await this.generateEmailVerificationToken(
      user.id,
      user.email,
    );
    this.emailService
      .sendVerificationEmail(user.email, user.displayName, verifyToken, {
        expiresIn: targetLang === 'ru' ? '24 часа' : '24 hours',
        lang: targetLang,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to send verification email to ${user.email}: ${msg}`,
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
    await this.invalidateUserSessions(userId);
    this.logger.log(`User ${userId} logged out`);
  }

  /**
   * Drops the active refresh-token session and revokes any access tokens
   * already issued to the user. We store the current time under the revoke
   * key; JwtStrategy rejects tokens with an older `iat`. The key only needs to
   * outlive the access-token lifetime, after which `exp` enforcement takes over.
   */
  private async invalidateUserSessions(userId: string): Promise<void> {
    await this.redisService.del(`user:session:${userId}`);

    const accessTtl = this.parseDurationSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
      900,
    );
    await this.redisService.set(
      tokenRevokeKey(userId),
      String(Math.floor(Date.now() / 1000)),
      accessTtl,
    );
  }

  /**
   * Initiates a password reset. Generates a single-use token, stores it in
   * Redis keyed to the user, and emails the reset link. To avoid leaking which
   * emails are registered, this resolves successfully whether or not the email
   * matches an account, and never throws on a missing/blocked user.
   */
  async forgotPassword(email: string, lang?: 'en' | 'ru'): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    // Silently no-op for unknown or blocked accounts (no user enumeration).
    if (!user || user.isBlocked) {
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.redisService.set(
      passwordResetKey(token),
      user.id,
      PASSWORD_RESET_TTL_SECONDS,
    );

    this.emailService
      .sendPasswordResetEmail(user.email, user.displayName, token, {
        expiresIn: lang === 'ru' ? '30 минут' : '30 minutes',
        lang,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to send password reset email to ${user.email}: ${msg}`,
        );
      });
  }

  /**
   * Completes a password reset. Validates the single-use token, updates the
   * password, consumes the token, and invalidates all existing sessions so a
   * compromised session can't outlive the reset.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redisService.get(passwordResetKey(token));
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Consume the token immediately (single-use) to prevent replay.
    await this.redisService.del(passwordResetKey(token));

    const user = await this.usersService.findById(userId);
    if (!user || user.isBlocked) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.usersService.updatePassword(userId, newPassword);
    await this.invalidateUserSessions(userId);

    this.logger.log(`Password reset completed for user ${userId}`);
  }

  /**
   * Mints a short-lived, self-contained JWT used to verify ownership of an
   * email address. The token carries the user id and is signed with a
   * dedicated secret so it can't be confused with access/refresh tokens.
   */
  async generateEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload: EmailVerifyPayload = {
      sub: userId,
      email,
      type: 'email-verify',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.getEmailVerifySecret(),
      expiresIn: (this.configService.get<string>('JWT_VERIFY_EMAIL_EXPIRES_IN') ||
        EMAIL_VERIFY_DEFAULT_EXPIRES_IN) as JwtSignOptions['expiresIn'],
    });
  }

  /**
   * Validates an email-verification token and flips the user's `isVerified`
   * flag. Throws BadRequestException (400) on any invalid/expired/forged token.
   *
   * Idempotent: re-clicking a still-valid link on an already-verified account
   * succeeds and reports `alreadyVerified: true` so the controller can show a
   * distinct "already verified" message instead of "just verified".
   */
  async verifyEmail(token: string): Promise<{ alreadyVerified: boolean }> {
    let payload: EmailVerifyPayload;
    try {
      payload = await this.jwtService.verifyAsync<EmailVerifyPayload>(token, {
        secret: this.getEmailVerifySecret(),
      });
    } catch {
      // Covers expired tokens, bad signatures and malformed input alike.
      throw new BadRequestException(
        'Verification link is invalid or has expired',
      );
    }

    if (payload.type !== 'email-verify') {
      throw new BadRequestException('Verification link is invalid');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new BadRequestException(
        'Verification link is invalid or has expired',
      );
    }

    if (user.isVerified) {
      return { alreadyVerified: true };
    }

    await this.usersService.markEmailVerified(user.id);
    this.logger.log(`Email verified for user ${user.id}`);
    return { alreadyVerified: false };
  }

  /**
   * Re-sends the verification email. Like forgotPassword, this resolves
   * successfully regardless of whether the email exists, is blocked, or is
   * already verified — so it can't be used to probe which emails are
   * registered or already confirmed.
   */
  async resendVerificationEmail(
    email: string,
    lang?: 'en' | 'ru',
  ): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    // No-op for unknown/blocked/already-verified accounts (no enumeration).
    if (!user || user.isBlocked || user.isVerified) {
      return;
    }

    const verifyToken = await this.generateEmailVerificationToken(
      user.id,
      user.email,
    );

    this.emailService
      .sendVerificationEmail(user.email, user.displayName, verifyToken, {
        expiresIn: lang === 'ru' ? '24 часа' : '24 hours',
        lang,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to resend verification email to ${user.email}: ${msg}`,
        );
      });
  }

  /**
   * Secret used to sign/verify email-verification tokens. Falls back to
   * JWT_ACCESS_SECRET (with a warning) so existing deployments keep working
   * until the dedicated secret is configured.
   */
  private getEmailVerifySecret(): string {
    const dedicated = this.configService.get<string>('JWT_VERIFY_EMAIL_SECRET');
    if (dedicated) return dedicated;
    this.logger.warn(
      'JWT_VERIFY_EMAIL_SECRET is not set — falling back to JWT_ACCESS_SECRET ' +
        'for email-verification links. Set a dedicated secret in production.',
    );
    return this.configService.get<string>('JWT_ACCESS_SECRET')!;
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
