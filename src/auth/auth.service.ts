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
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { TokensDto } from './dto/tokens.dto.js';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface UserEntity {
  id: string;
  email: string;
  role: string;
  displayName: string;
  passwordHash: string | null;
  avatarUrl: string | null;
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
  ) {}

  async register(dto: RegisterDto): Promise<TokensDto> {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<TokensDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokensDto> {
    const storedHash = await this.redisService.get(
      `user:session:${userId}`,
    );

    if (!storedHash) {
      throw new ForbiddenException('Session expired');
    }

    const isValid = await bcrypt.compare(refreshToken, storedHash);
    if (!isValid) {
      await this.redisService.del(`user:session:${userId}`);
      throw new ForbiddenException('Invalid refresh token');
    }

    const user = await this.usersService.findByIdOrThrow(userId);
    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.del(`user:session:${userId}`);
    this.logger.log(`User ${userId} logged out`);
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
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') as JwtSignOptions['expiresIn'],
    };

    const refreshOpts: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') as JwtSignOptions['expiresIn'],
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
