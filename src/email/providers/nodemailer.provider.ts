import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  MailProvider,
  SendMailOptions,
} from '../interfaces/mail-provider.interface.js';

interface SMTPTransportOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
  auth?: {
    user?: string;
    pass?: string;
  };
}

@Injectable()
export class NodemailerMailProvider implements MailProvider, OnModuleInit {
  private readonly logger = new Logger(NodemailerMailProvider.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const fromEmail = this.configService.get<string>(
      'SMTP_FROM_EMAIL',
      'noreply@frontendtales.com',
    );
    const fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'Frontend Tales',
    );

    this.fromAddress = `"${fromName}" <${fromEmail}>`;

    const transportOptions: SMTPTransportOptions = {
      host,
      port,
      secure,
      pool: true, // Reuse SMTP connections
      maxConnections: 5,
      maxMessages: 100,
    };

    if (user && pass) {
      transportOptions.auth = {
        user,
        pass,
      };
    }

    // Cast options safely when passing to external library
    this.transporter = nodemailer.createTransport(
      transportOptions as unknown as nodemailer.TransportOptions,
    );
  }

  onModuleInit(): void {
    // Asynchronously verify transporter connection so it doesn't block server startup
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(
          `SMTP configuration verification failed: ${error.message}. Please check your environment variables.`,
        );
      } else {
        this.logger.log(
          'SMTP configuration verified successfully. Mailer is ready.',
        );
      }
    });
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const info = (await this.transporter.sendMail(mailOptions)) as {
        messageId: string;
      };
      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
