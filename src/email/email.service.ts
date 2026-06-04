import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import {
  MailProvider,
  SendMailOptions,
} from './interfaces/mail-provider.interface.js';
import { getWelcomeEmailTemplate } from './templates/welcome.template.js';

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

  constructor(
    @Inject(MailProvider) private readonly mailProvider: MailProvider,
    private readonly configService: ConfigService,
  ) {}

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
