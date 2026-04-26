import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    oAuthAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
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
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'a@b.com',
          passwordHash: 'hashed',
          displayName: 'Alex',
          avatarUrl: undefined,
          role: 'USER',
        },
      });
      expect(result).toBe(created);
    });

    it('should leave passwordHash null when no password provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'u1' });

      await service.create({ email: 'a@b.com', displayName: 'Alex' });

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
      const linkedUser = { id: 'u1' };
      mockPrisma.oAuthAccount.findUnique.mockResolvedValue({
        user: linkedUser,
      });

      const result = await service.findOrCreateByOAuth(profile);

      expect(result).toBe(linkedUser);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should link new oauth account when user with email exists', async () => {
      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      const existingUser = { id: 'u1', email: 'a@b.com' };
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
      expect(result).toBe(existingUser);
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
});
