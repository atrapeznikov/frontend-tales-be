import { Test, TestingModule } from '@nestjs/testing';
import { QuickActionsController } from './admin-actions.controller.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service.js';
import { CommentsService } from '../comments/comments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';

describe('QuickActionsController', () => {
  let controller: QuickActionsController;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'JWT_ACCESS_SECRET') return 'secret';
      if (key === 'FRONTEND_URL') return 'http://frontend.com';
      return defaultValue;
    }),
  };

  const mockUsersService = {
    blockUser: jest.fn(),
  };

  const mockCommentsService = {
    deleteComment: jest.fn(),
  };

  const mockPrismaService = {
    comment: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  // getClient().set(..., 'NX') returns 'OK' when the jti is fresh (not yet used).
  const mockRedisClient = {
    set: jest.fn().mockResolvedValue('OK'),
  };
  const mockRedisService = {
    getClient: jest.fn(() => mockRedisClient),
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickActionsController],
      providers: [
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: CommentsService, useValue: mockCommentsService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<QuickActionsController>(QuickActionsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('confirm', () => {
    it('should return error HTML if token verify fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      await controller.confirm(mockResponse, 'delete-comment', 'invalid-token', 'art-1', 'comm-1', undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Ссылка недействительна'));
    });

    it('should render confirmation page for block-user', async () => {
      const payload = { action: 'block-user', userId: 'u1' };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1', displayName: 'Alex', email: 'a@b.com' });

      await controller.confirm(mockResponse, 'block-user', 'token', undefined, undefined, 'u1');

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Блокировка пользователя'));
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Alex'));
    });

    it('should HTML-escape a malicious displayName to prevent stored XSS', async () => {
      const payload = { action: 'block-user', userId: 'u1' };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        displayName: '<img src=x onerror=alert(1)>',
        email: '"><script>alert(2)</script>',
      });

      await controller.confirm(mockResponse, 'block-user', 'token', undefined, undefined, 'u1');

      const html = (mockResponse.send as jest.Mock).mock.calls[0][0] as string;
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).not.toContain('<script>alert(2)</script>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    });
  });

  describe('execute', () => {
    it('should successfully execute block-user and return success HTML', async () => {
      const payload = { action: 'block-user', userId: 'u1', jti: 'jti-1' };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      await controller.execute(mockResponse, 'block-user', 'token', undefined, undefined, 'u1');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'action:used:jti-1',
        '1',
        'EX',
        24 * 60 * 60,
        'NX',
      );
      expect(mockUsersService.blockUser).toHaveBeenCalledWith('u1');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Пользователь был заблокирован'));
    });

    it('should reject a replayed token whose jti was already consumed', async () => {
      const payload = { action: 'block-user', userId: 'u1', jti: 'jti-used' };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      // Redis SET NX returns null when the key already exists (replay).
      mockRedisClient.set.mockResolvedValueOnce(null);

      await controller.execute(mockResponse, 'block-user', 'token', undefined, undefined, 'u1');

      expect(mockUsersService.blockUser).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });
});
