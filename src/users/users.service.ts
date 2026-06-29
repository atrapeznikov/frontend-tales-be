import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { S3Service } from '../s3/s3.service.js';
import * as bcrypt from 'bcrypt';

// Use Prisma-generated types via the service rather than importing enums directly
// to work with isolatedModules + emitDecoratorMetadata

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  getRandomDefaultAvatar(): string {
    const num = Math.floor(Math.random() * 10) + 1;
    const prefix =
      this.configService.get<string>('AVATAR_DB_PREFIX') ||
      'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/';
    return `${prefix}default${num}.svg`;
  }

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
    nickname: string;
    avatarUrl?: string;
  }) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException(
        'An account with this information already exists',
      );
    }

    const existingNickname = await this.prisma.user.findUnique({
      where: { nickname: data.nickname },
    });
    if (existingNickname) {
      throw new ConflictException('User with this nickname already exists');
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
        nickname: data.nickname,
        avatarUrl: data.avatarUrl || this.getRandomDefaultAvatar(),
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
    // Sanitize OAuth display name — strip HTML tags to prevent stored XSS
    const sanitizedDisplayName =
      profile.displayName.replace(/<[^>]*>/g, '').trim() ||
      profile.email.split('@')[0];

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
      if (!existingOAuth.user.avatarUrl) {
        const defaultAvatar = this.getRandomDefaultAvatar();
        const updatedUser = await this.prisma.user.update({
          where: { id: existingOAuth.user.id },
          data: { avatarUrl: defaultAvatar },
        });
        return updatedUser;
      }
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

      // The provider already proved ownership of this email, so verify the
      // account; also backfill a default avatar if it's missing. Only touch the
      // DB when something actually changes.
      const needsAvatar = !existingUser.avatarUrl;
      const needsVerify = !existingUser.isVerified;
      if (needsAvatar || needsVerify) {
        return this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            ...(needsAvatar
              ? { avatarUrl: this.getRandomDefaultAvatar() }
              : {}),
            ...(needsVerify ? { isVerified: true } : {}),
          },
        });
      }
      return existingUser;
    }

    // 3. Create new user + OAuth account
    const usersCount = await this.prisma.user.count();
    const role = usersCount === 0 ? 'ADMIN' : 'USER';

    return this.prisma.user.create({
      data: {
        email: profile.email,
        displayName: sanitizedDisplayName,
        nickname: null, // Left as null until user sets it
        avatarUrl: profile.avatarUrl || this.getRandomDefaultAvatar(),
        role,
        // OAuth provider already verified the email — skip our own flow.
        isVerified: true,
        oauthAccounts: {
          create: {
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
          },
        },
      },
    });
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    // Ensure user exists
    const user = await this.findByIdOrThrow(userId);

    // Derive the extension and content type from the *validated* mimetype, not
    // the client-supplied filename. The controller's FileTypeValidator already
    // verified the magic number matches one of these image types, so this map
    // also defends against path/extension injection via originalname.
    const extByMime: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    const extension = extByMime[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Unsupported image type');
    }

    // Generate unique S3 key (server-controlled — no user input in the path)
    const filename = `${userId}-${Date.now()}.${extension}`;
    const s3Key = `avatars/${filename}`;

    // Upload to S3 with the validated content type (never echo client mimetype)
    await this.s3Service.uploadFile(file, s3Key, file.mimetype);

    // Construct the database CDN-prefixed avatar URL
    const dbPrefix =
      this.configService.get<string>('AVATAR_DB_PREFIX') ||
      'https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/';
    const avatarUrl = `${dbPrefix}${filename}`;
eTypeValidator({ fileType: 'image/(png|jpeg|webp|gif)' }),
          new FileTypeValidator({ fileType: 'image/(png|jpeg|webp)' }),
        ],
    // Delete old avatar from S3 if it was not a default avatar and was hosted on our S3
    const oldAvatarUrl = user.avatarUrl;
    if (oldAvatarUrl && oldAvatarUrl.startsWith(dbPrefix)) {
      const isDefault = oldAvatarUrl.includes('default');
      if (!isDefault) {
        const oldFilename = oldAvatarUrl.replace(dbPrefix, '');
        if (oldFilename) {
          const oldS3Key = `avatars/${oldFilename}`;
          await this.s3Service.deleteFile(oldS3Key).catch((err) => {
            this.logger.warn(`Failed to delete old avatar ${oldS3Key}: ${err.message}`);
          });
        }
      }
    }

    // Update user record in Prisma
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }

  async updateAvatarUrl(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }

  async updateNickname(userId: string, nickname: string) {
    const existing = await this.prisma.user.findUnique({
      where: { nickname },
    });
    if (existing) {
      throw new ConflictException('User with this nickname already exists');
    }

    const user = await this.findByIdOrThrow(userId);
    if (user.nickname) {
      throw new BadRequestException('Nickname is already set');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
    });
  }

  async updatePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /** Marks the user's email as verified (idempotent — safe to call twice). */
  async markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
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

  async blockUser(id: string) {
    const user = await this.findByIdOrThrow(id);

    if (user.role === 'ADMIN') {
      throw new BadRequestException('Cannot block an administrator');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isBlocked: true },
    });

    await this.redis.del(`user:session:${id}`);

    return updatedUser;
  }

  async getUserComments(userId: string) {
    const [comments, replies] = await Promise.all([
      this.prisma.comment.findMany({
        where: { userId },
        include: {
          article: {
            include: {
              translations: true,
            },
          },
        },
      }),
      this.prisma.commentReply.findMany({
        where: { userId },
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
      }),
    ]);

    const formattedComments = comments.map((c) => ({
      id: `comment-${c.id}`,
      content: c.content,
      createdAt: c.createdAt,
      articleSlug: c.article.slug,
      articleTranslations: c.article.translations.map((t) => ({
        language: t.language,
        title: t.title,
      })),
    }));

    const formattedReplies = replies.map((r) => {
      const article = r.comment.article;
      return {
        id: `reply-${r.id}`,
        content: r.content,
        createdAt: r.createdAt,
        articleSlug: article.slug,
        articleTranslations: article.translations.map((t) => ({
          language: t.language,
          title: t.title,
        })),
      };
    });

    return [...formattedComments, ...formattedReplies].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
}
