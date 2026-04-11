import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

// Use Prisma-generated types via the service rather than importing enums directly
// to work with isolatedModules + emitDecoratorMetadata

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(data: {
    email: string;
    password?: string;
    displayName: string;
    avatarUrl?: string;
  }) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 12)
      : null;

    const role = 'USER';

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        role,
      },
    });
  }

  async findOrCreateByOAuth(profile: {
    provider: 'GOOGLE' | 'GITHUB' | 'YANDEX';
    providerAccountId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    // 1. Check if OAuth account already linked
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingOAuth) {
      // OAuth tokens are not stored — we only need them for the initial auth flow
      return existingOAuth.user;
    }

    // 2. Check if user exists by email
    const existingUser = await this.findByEmail(profile.email);

    if (existingUser) {
      // Link new OAuth account to existing user (don't store provider tokens)
      await this.prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      });
      return existingUser;
    }

    // 3. Create new user + OAuth account
    const usersCount = await this.prisma.user.count();
    const role = usersCount === 0 ? 'ADMIN' : 'USER';

    return this.prisma.user.create({
      data: {
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        role,
        oauthAccounts: {
          create: {
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
          },
        },
      },
    });
  }

  async validatePassword(
    user: { passwordHash: string | null },
    password: string,
  ): Promise<boolean> {
    if (!user.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, user.passwordHash);
  }
}
