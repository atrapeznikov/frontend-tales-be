import { Injectable, Logger } from '@nestjs/common';
import {
  MailProvider,
  SendMailOptions,
} from '../interfaces/mail-provider.interface.js';

@Injectable()
export class ConsoleMailProvider implements MailProvider {
  private readonly logger = new Logger(ConsoleMailProvider.name);

  async send(options: SendMailOptions): Promise<void> {
    this.logger.log(`
========================================
📧 EMAIL SENT (CONSOLE PROVIDER)
To: ${options.to}
Subject: ${options.subject}
----------------------------------------
Text Content:
${options.text || '(No text version provided)'}
----------------------------------------
HTML Content:
${options.html}
========================================
    `);
    await Promise.resolve();
  }
}
