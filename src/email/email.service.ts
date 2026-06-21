import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as path from 'path';
import * as fs from 'fs';
import {
  MailProvider,
  SendMailOptions,
} from './interfaces/mail-provider.interface.js';
import { getWelcomeEmailTemplate } from './templates/welcome.template.js';
import { getNewCommentTemplate } from './templates/new-comment.template.js';
import { getPasswordResetTemplate } from './templates/password-reset.template.js';
import { getVerifyEmailTemplate } from './templates/verify-email.template.js';
import { v4 as uuid } from 'uuid';

const possiblePaths = [
  path.join(__dirname, 'templates', 'avatar.png'),
  path.join(__dirname, '..', 'email', 'templates', 'avatar.png'),
  path.join(process.cwd(), 'src', 'email', 'templates', 'avatar.png'),
];

let avatarPath = possiblePaths[0];
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    avatarPath = p;
    break;
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private warnedAboutActionSecret = false;

  /**
   * Secret used to sign admin quick-action (email link) tokens. Prefers the
   * dedicated JWT_ACTION_SECRET; falls back to JWT_ACCESS_SECRET with a warning
   * so existing deployments keep working until the dedicated secret is set.
   */
  private getActionTokenSecret(): string {
    const dedicated = this.configService.get<string>('JWT_ACTION_SECRET');
    if (dedicated) return dedicated;
    if (!this.warnedAboutActionSecret) {
      this.logger.warn(
        'JWT_ACTION_SECRET is not set — falling back to JWT_ACCESS_SECRET for ' +
          'admin action links. Set a dedicated secret in production.',
      );
      this.warnedAboutActionSecret = true;
    }
    return this.configService.get<string>('JWT_ACCESS_SECRET')!;
  }

  constructor(
    @Inject(MailProvider) private readonly mailProvider: MailProvider,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Sends a new comment notification email to an admin.
   */
  async sendNewCommentNotification(
    to: string,
    data: {
      articleId: string;
      articleSlug: string;
      articleTitle: string;
      commentId: string;
      commentContent: string;
      authorName: string;
      authorEmail: string;
      authorId: string;
    },
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const backendUrl = this.configService.get<string>(
      'BACKEND_URL',
      'http://localhost:3000',
    );

    // Generate short-lived, single-use quick action tokens. The `jti` is
    // consumed in Redis the first time the action is executed (see
    // QuickActionsController), preventing replay even within the token's life.
    const secret = this.getActionTokenSecret();
    const deleteToken = await this.jwtService.signAsync(
      {
        action: 'delete-comment',
        articleId: data.articleId,
        commentId: data.commentId,
        jti: uuid(),
      },
      {
        secret,
        expiresIn: '2h',
      },
    );

    const blockToken = await this.jwtService.signAsync(
      {
        action: 'block-user',
        userId: data.authorId,
        jti: uuid(),
      },
      {
        secret,
        expiresIn: '2h',
      },
    );

    const deleteLink = `${backendUrl}/api/admin/quick-actions/confirm?action=delete-comment&articleId=${data.articleId}&commentId=${data.commentId}&token=${deleteToken}`;
    const blockLink = `${backendUrl}/api/admin/quick-actions/confirm?action=block-user&userId=${data.authorId}&token=${blockToken}`;
    const articleLink = `${frontendUrl}/ru/blog/${data.articleSlug}`;

    const { subject, html, text } = getNewCommentTemplate({
      articleTitle: data.articleTitle,
      articleLink,
      commentContent: data.commentContent,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      authorId: data.authorId,
      deleteLink,
      blockLink,
    });

    try {
      await this.sendWithRetry({
        to,
        subject,
        html,
        text,
        attachments: [
          {
            filename: 'avatar.png',
            path: avatarPath,
            cid: 'avatar',
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        `Critical: New comment notification could not be sent to admin ${to}: ${error}`,
      );
    }
  }

  /**
   * Sends a welcome email to the newly registered user.
   */
  async sendWelcomeEmail(
    to: string,
    displayName: string,
    lang?: 'en' | 'ru',
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const { subject, html, text } = getWelcomeEmailTemplate({
      displayName,
      frontendUrl,
      lang,
    });

    try {
      await this.sendWithRetry({
        to,
        subject,
        html,
        text,
        attachments: [
          {
            filename: 'avatar.png',
            path: avatarPath,
            cid: 'avatar',
          },
        ],
      });
    } catch (error) {
      // In production, you might want to log this to an external error tracker
      // or schedule a background retry job (e.g. BullMQ) rather than failing the registration process.
      this.logger.error(
        `Critical: Welcome email could not be sent to ${to}: ${error}`,
      );
    }
  }

  /**
   * Sends a password reset email containing a single-use reset link.
   */
  async sendPasswordResetEmail(
    to: string,
    displayName: string,
    resetToken: string,
    options?: { expiresIn?: string; lang?: 'en' | 'ru' },
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(
      resetToken,
    )}`;

    const { subject, html, text } = getPasswordResetTemplate({
      displayName,
      resetUrl,
      frontendUrl,
      expiresIn: options?.expiresIn,
      lang: options?.lang,
    });

    try {
      await this.sendWithRetry({
        to,
        subject,
        html,
        text,
        attachments: [
          {
            filename: 'avatar.png',
            path: avatarPath,
            cid: 'avatar',
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        `Critical: Password reset email could not be sent to ${to}: ${error}`,
      );
    }
  }

  /**
   * Sends an email-verification message containing a single link the user
   * clicks to confirm ownership of their address after registration.
   */
  async sendVerificationEmail(
    to: string,
    displayName: string,
    verifyToken: string,
    options?: { expiresIn?: string; lang?: 'en' | 'ru' },
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(
      verifyToken,
    )}`;

    const { subject, html, text } = getVerifyEmailTemplate({
      displayName,
      verifyUrl,
      frontendUrl,
      expiresIn: options?.expiresIn,
      lang: options?.lang,
    });

    try {
      await this.sendWithRetry({
        to,
        subject,
        html,
        text,
        attachments: [
          {
            filename: 'avatar.png',
            path: avatarPath,
            cid: 'avatar',
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        `Critical: Verification email could not be sent to ${to}: ${error}`,
      );
    }
  }

  /**
   * Helper method to send email with exponential backoff retry logic.
   */
  private async sendWithRetry(
    options: SendMailOptions,
    retries = 3,
    delayMs = 1000,
  ): Promise<void> {
    let attempt = 0;
    while (attempt < retries) {
      try {
        await this.mailProvider.send(options);
        return;
      } catch (error: unknown) {
        attempt++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.warn(
          `Failed sending email to ${options.to} (attempt ${attempt}/${retries}): ${errorMessage}`,
        );
        if (attempt >= retries) {
          this.logger.error(
            `Failed sending email to ${options.to} after ${retries} attempts: ${errorMessage}`,
            errorStack,
          );
          throw error;
        }
        // Exponential backoff delay
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)),
        );
      }
    }
  }
}
