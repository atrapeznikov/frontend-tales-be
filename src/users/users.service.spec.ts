import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { S3Service } from '../s3/s3.service.js';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    oAuthAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    comment: {
      findMany: jest.fn(),
    },
    commentReply: {
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'AVATAR_DB_PREFIX') {
        return 'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/';
      }
      return null;
    }),
  };

  const mockS3Service = {
    uploadFile: jest
      .fn()
      .mockResolvedValue(
        'https://s3.twcstorage.ru/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/test.png',
      ),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = { id: 'u1' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById('u1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
      });
      expect(result).toBe(user);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await service.findById('missing')).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const user = { id: 'u1', email: 'a@b.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('a@b.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
      expect(result).toBe(user);
    });
  });

  describe('findByIdOrThrow', () => {
    it('should return user when found', async () => {
      const user = { id: 'u1' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      expect(await service.findByIdOrThrow('u1')).toBe(user);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should hash password and create user when email is unique', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      const created = { id: 'u1' };
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.create({
        email: 'a@b.com',
        password: 'password',
        displayName: 'Alex',
        nickname: 'alex',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'a@b.com',
          passwordHash: 'hashed',
          displayName: 'Alex',
          nickname: 'alex',
          avatarUrl: expect.stringMatching(/default\d+\.svg/),
          role: 'USER',
        },
      });
      expect(result).toBe(created);
    });

    it('should leave passwordHash null when no password provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'u1' });

      await service.create({
        email: 'a@b.com',
        displayName: 'Alex',
        nickname: 'alex',
      });

      expect(bcrypt.hash).not.toHaveBeenCalled();
      const callArg = mockPrisma.user.create.mock.calls[0][0];
      expect(callArg.data.passwordHash).toBeNull();
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          email: 'a@b.com',
          password: 'pw',
          displayName: 'Alex',
          nickname: 'alex',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateByOAuth', () => {
    const profile = {
      provider: 'GOOGLE' as const,
      providerAccountId: 'gid-1',
      email: 'a@b.com',
      displayName: 'Alex',
      avatarUrl: 'https://x/y.png',
      accessToken: 'at',
      refreshToken: 'rt',
    };

    it('should return user when oauth account already linked', async () => {
      const linkedUser = { id: 'u1', avatarUrl: 'https://x/y.png' };
      mockPrisma.oAuthAccount.findUnique.mockResolvedValue({
        user: linkedUser,
      });

      const result = await service.findOrCreateByOAuth(profile);

      expect(result).toBe(linkedUser);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should link new oauth account when user with email exists', async () => {
      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      // Already has an avatar and is verified — nothing to update, return as-is.
      const existingUser = {
        id: 'u1',
        email: 'a@b.com',
        avatarUrl: 'https://x/y.png',
        isVerified: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.oAuthAccount.create.mockResolvedValue({});

      const result = await service.findOrCreateByOAuth(profile);

      expect(mockPrisma.oAuthAccount.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          provider: 'GOOGLE',
          providerAccountId: 'gid-1',
        },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(result).toBe(existingUser);
    });

    it('should verify an unverified user when they link an oauth account', async () => {
      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      const existingUser = {
        id: 'u1',
        email: 'a@b.com',
        avatarUrl: 'https://x/y.png',
        isVerified: false,
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.oAuthAccount.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        isVerified: true,
      });

      const result = await service.findOrCreateByOAuth(profile);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isVerified: true },
      });
      expect(result.isVerified).toBe(true);
    });

    it('should create the first user with ADMIN role', async () => {
      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(0);
      const created = { id: 'u1', role: 'ADMIN' };
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.findOrCreateByOAuth(profile);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: 'ADMIN' }),
      });
      expect(result).toBe(created);
    });

    it('should create subsequent users with USER role', async () => {
      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.user.create.mockResolvedValue({ id: 'u1', role: 'USER' });

      await service.findOrCreateByOAuth(profile);

      const callArg = mockPrisma.user.create.mock.calls[0][0];
      expect(callArg.data.role).toBe('USER');
      // OAuth provider verified the email, so the account is created verified.
      expect(callArg.data.isVerified).toBe(true);
      expect(callArg.data.oauthAccounts).toEqual({
        create: { provider: 'GOOGLE', providerAccountId: 'gid-1' },
      });
    });
  });

  describe('validatePassword', () => {
    it('should return false when user has no passwordHash', async () => {
      const result = await service.validatePassword(
        { passwordHash: null },
        'pw',
      );
      expect(result).toBe(false);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return true when bcrypt.compare resolves true', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(
        { passwordHash: 'hashed' },
        'pw',
      );

      expect(bcrypt.compare).toHaveBeenCalledWith('pw', 'hashed');
      expect(result).toBe(true);
    });

    it('should return false when bcrypt.compare resolves false', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(
        { passwordHash: 'hashed' },
        'wrong',
      );

      expect(result).toBe(false);
    });
  });

  describe('updateNickname', () => {
    it('should update user nickname when unique and currently null', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // nickname not taken
      const user = { id: 'u1', nickname: null };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(user); // findUnique by id
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        nickname: 'newname',
      });

      const result = await service.updateNickname('u1', 'newname');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { nickname: 'newname' },
      });
      expect(result.nickname).toBe('newname');
    });

    it('should throw ConflictException if nickname already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'other' });

      await expect(service.updateNickname('u1', 'taken')).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already has a nickname', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // nickname not taken
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        nickname: 'already',
      }); // findById

      await expect(service.updateNickname('u1', 'newname')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('blockUser', () => {
    it('should successfully block user and delete redis session', async () => {
      const user = { id: 'u1', role: 'USER' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', isBlocked: true });

      const result = await service.blockUser('u1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isBlocked: true },
      });
      expect(mockRedisService.del).toHaveBeenCalledWith('user:session:u1');
      expect(result.isBlocked).toBe(true);
    });

    it('should throw BadRequestException when trying to block an admin', async () => {
      const user = { id: 'u1', role: 'ADMIN' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await expect(service.blockUser('u1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('getUserComments', () => {
    it('should query and return combined and sorted comments and replies', async () => {
      const now = new Date();
      const mockComments = [
        {
          id: 'c1',
          content: 'Main comment',
          createdAt: new Date(now.getTime() - 1000),
          article: {
            slug: 'slug1',
            translations: [{ language: 'en', title: 'Article 1' }],
          },
        },
      ];

      const mockReplies = [
        {
          id: 'r1',
          content: 'Reply comment',
          createdAt: now,
          comment: {
            article: {
              slug: 'slug2',
              translations: [{ language: 'en', title: 'Article 2' }],
            },
          },
        },
      ];

      mockPrisma.comment.findMany.mockResolvedValue(mockComments);
      mockPrisma.commentReply.findMany.mockResolvedValue(mockReplies);

      const result = await service.getUserComments('u1');

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: {
          article: {
            include: {
              translations: true,
            },
          },
        },
      });

      expect(mockPrisma.commentReply.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: {
          comment: {
            include: {
              article: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'reply-r1',
        content: 'Reply comment',
        createdAt: now,
        articleSlug: 'slug2',
        articleTranslations: [{ language: 'en', title: 'Article 2' }],
      });
      expect(result[1]).toEqual({
        id: 'comment-c1',
        content: 'Main comment',
        createdAt: new Date(now.getTime() - 1000),
        articleSlug: 'slug1',
        articleTranslations: [{ language: 'en', title: 'Article 1' }],
      });
    });
  });

  describe('getRandomDefaultAvatar', () => {
    it('should return a valid default avatar URL', () => {
      const avatar = service.getRandomDefaultAvatar();
      expect(avatar).toMatch(/default\d+\.svg/);
    });
  });

  describe('updateAvatar', () => {
    it('should upload avatar to S3 and save CDN URL in DB', async () => {
      const user = { id: 'u1', email: 'a@b.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        avatarUrl:
          'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/u1-12345.png',
      });

      const file = {
        originalname: 'my-avatar.png',
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      const result = await service.updateAvatar('u1', file);

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        file,
        expect.stringContaining('avatars/u1-'),
        'image/png',
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: expect.stringContaining('/avatars/u1-') },
      });
      expect(result.avatarUrl).toContain('u1-');
    });

    it('should delete the old avatar from S3 if it was not a default avatar and was hosted on our S3', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        avatarUrl:
          'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/u1-old.png',
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        avatarUrl:
          'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/u1-new.png',
      });

      const file = {
        originalname: 'my-avatar.png',
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      await service.updateAvatar('u1', file);

      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(
        'avatars/u1-old.png',
      );
    });

    it('should NOT delete the old avatar from S3 if it was a default avatar', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        avatarUrl:
          'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/default3.svg',
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        avatarUrl:
          'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/u1-new.png',
      });

      const file = {
        originalname: 'my-avatar.png',
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      await service.updateAvatar('u1', file);

      expect(mockS3Service.deleteFile).not.toHaveBeenCalled();
    });

    it('should NOT delete the old avatar from S3 if it was an external OAuth URL', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        avatarUrl: 'https://lh3.googleusercontent.com/a/some-photo',
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        avatarUrl:
          'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/u1-new.png',
      });

      const file = {
        originalname: 'my-avatar.png',
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
      } as Express.Multer.File;

      await service.updateAvatar('u1', file);

      expect(mockS3Service.deleteFile).not.toHaveBeenCalled();
    });
  });
});
