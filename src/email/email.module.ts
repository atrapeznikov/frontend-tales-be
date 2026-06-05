import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from './email.service.js';
import { MailProvider } from './interfaces/mail-provider.interface.js';
import { ConsoleMailProvider } from './providers/console.provider.js';
import { NodemailerMailProvider } from './providers/nodemailer.provider.js';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    EmailService,
    ConsoleMailProvider,
    NodemailerMailProvider,
    {
      provide: MailProvider,
      useFactory: (
        configService: ConfigService,
        consoleProvider: ConsoleMailProvider,
        nodemailerProvider: NodemailerMailProvider,
      ) => {
        const provider = configService.get<string>('EMAIL_PROVIDER', 'console');
        return provider === 'smtp' ? nodemailerProvider : consoleProvider;
      },
      inject: [ConfigService, ConsoleMailProvider, NodemailerMailProvider],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
