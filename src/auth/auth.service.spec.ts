import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis.service.js';
import { EmailService } from '../email/index.js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('bcrypt');
jest.mock('uuid', () => ({ v4: jest.fn(() => 'fixed-uuid') }));
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => Buffer.from('reset-token-bytes')),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    validatePassword: jest.fn(),
    updatePassword: jest.fn(),
    findByIdOrThrow: jest.fn(),
    getRandomDefaultAvatar: jest.fn().mockReturnValue('https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/default1.svg'),
    updateAvatarUrl: jest.fn().mockImplementation((userId, url) => Promise.resolve({
      id: userId,
      email: 'a@b.com',
      role: 'USER',
      displayName: 'Alex',
      nickname: 'alex',
      passwordHash: 'hashed',
      avatarUrl: url,
      isBlocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return map[key];
    }),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const userEntity = {
    id: 'u1',
    email: 'a@b.com',
    role: 'USER',
    displayName: 'Alex',
    nickname: 'alex',
    passwordHash: 'hashed',
    avatarUrl: null,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    mockJwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from('reset-token-bytes'),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a user and return tokens', async () => {
      mockUsersService.create.mockResolvedValue(userEntity);

      const result = await service.register({
        email: 'a@b.com',
        password: 'pw',
        displayName: 'Alex',
        nickname: 'alex',
      });

      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pw',
        displayName: 'Alex',
        nickname: 'alex',
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `user:session:${userEntity.id}`,
        'hashed-refresh',
        7 * 24 * 60 * 60,
      );
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        userEntity.email,
        userEntity.displayName,
        undefined,
      );
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(userEntity);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.login({ email: 'a@b.com', password: 'pw' });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'a@b.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(userEntity);
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@b.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should throw ForbiddenException when no session stored', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.refreshTokens('u1', 'rt')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException and delete session when token mismatches', async () => {
      mockRedisService.get.mockResolvedValue('stored-hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens('u1', 'rt')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('user:session:u1');
    });

    it('should return new tokens when refresh token is valid', async () => {
      mockRedisService.get.mockResolvedValue('stored-hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.findByIdOrThrow.mockResolvedValue(userEntity);

      const result = await service.refreshTokens('u1', 'rt');

      expect(mockUsersService.findByIdOrThrow).toHaveBeenCalledWith('u1');
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('should delete the user session from redis', async () => {
      await service.logout('u1');
      expect(mockRedisService.del).toHaveBeenCalledWith('user:session:u1');
    });
  });

  describe('forgotPassword', () => {
    const resetToken = Buffer.from('reset-token-bytes').toString('hex');

    it('should store a reset token and send the email for a known user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(userEntity);

      await service.forgotPassword('a@b.com', 'en');

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `auth:password-reset:${resetToken}`,
        userEntity.id,
        30 * 60,
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        userEntity.email,
        userEntity.displayName,
        resetToken,
        { expiresIn: '30 minutes', lang: 'en' },
      );
    });

    it('should no-op silently when the email is unknown', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.forgotPassword('nope@b.com')).resolves.toBeUndefined();

      expect(mockRedisService.set).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should no-op silently when the user is blocked', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...userEntity,
        isBlocked: true,
      });

      await service.forgotPassword('a@b.com');

      expect(mockRedisService.set).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw UnauthorizedException when the token is invalid/expired', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'NewPw1!')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should consume the token and reject when the user is gone', async () => {
      mockRedisService.get.mockResolvedValue('u1');
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.resetPassword('tok', 'NewPw1!')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('auth:password-reset:tok');
      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should reject a blocked user but still consume the token', async () => {
      mockRedisService.get.mockResolvedValue('u1');
      mockUsersService.findById.mockResolvedValue({
        ...userEntity,
        isBlocked: true,
      });

      await expect(service.resetPassword('tok', 'NewPw1!')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('auth:password-reset:tok');
      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should update the password, consume the token, and invalidate sessions', async () => {
      mockRedisService.get.mockResolvedValue('u1');
      mockUsersService.findById.mockResolvedValue(userEntity);

      await service.resetPassword('tok', 'NewPw1!');

      expect(mockRedisService.del).toHaveBeenCalledWith('auth:password-reset:tok');
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith('u1', 'NewPw1!');
      // sessions invalidated: refresh session dropped + access tokens revoked
      expect(mockRedisService.del).toHaveBeenCalledWith('user:session:u1');
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'auth:revoke-before:u1',
        expect.any(String),
        900,
      );
    });
  });

  describe('createOAuthCode', () => {
    it('should generate uuid and store userId in redis with 60s ttl', async () => {
      const code = await service.createOAuthCode('u1');
      expect(code).toBe('fixed-uuid');
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'oauth:code:fixed-uuid',
        'u1',
        60,
      );
    });
  });

  describe('exchangeOAuthCode', () => {
    it('should throw UnauthorizedException when code not found', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.exchangeOAuthCode('code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete code, fetch user, and return tokens for valid code', async () => {
      mockRedisService.get.mockResolvedValue('u1');
      mockUsersService.findByIdOrThrow.mockResolvedValue(userEntity);

      const result = await service.exchangeOAuthCode('code');

      expect(mockRedisService.del).toHaveBeenCalledWith('oauth:code:code');
      expect(mockUsersService.findByIdOrThrow).toHaveBeenCalledWith('u1');
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('generateTokens', () => {
    it('should sign payload with access and refresh secrets and persist hash', async () => {
      await service.generateTokens(userEntity);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'u1', email: 'a@b.com', role: 'USER' },
        { secret: 'access-secret', expiresIn: '15m' },
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'u1', email: 'a@b.com', role: 'USER' },
        { secret: 'refresh-secret', expiresIn: '7d' },
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('refresh-token', 10);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'user:session:u1',
        'hashed-refresh',
        7 * 24 * 60 * 60,
      );
    });
  });
});
