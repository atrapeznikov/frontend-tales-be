import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis.service.js';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('uuid', () => ({ v4: jest.fn(() => 'fixed-uuid') }));

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
    findByIdOrThrow: jest.fn(),
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

  const userEntity = {
    id: 'u1',
    email: 'a@b.com',
    role: 'USER',
    displayName: 'Alex',
    passwordHash: 'hashed',
    avatarUrl: null,
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    mockJwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
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
      });

      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pw',
        displayName: 'Alex',
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
