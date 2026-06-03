import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service.js';
import { MailProvider } from './interfaces/mail-provider.interface.js';

describe('EmailService', () => {
  let service: EmailService;

  const mockMailProvider = {
    send: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'FRONTEND_URL') return 'http://test-frontend.com';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailProvider, useValue: mockMailProvider },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);

    // Speed up test execution by bypassing setTimeout delays
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
      cb();
      return 1 as unknown as NodeJS.Timeout;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should successfully send a welcome email on the first attempt', async () => {
      mockMailProvider.send.mockResolvedValue(undefined);

      await service.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(mockMailProvider.send).toHaveBeenCalledTimes(1);
      const calls = mockMailProvider.send.mock.calls as unknown as Array<
        [
          {
            to: string;
            subject: string;
            html: string;
            text: string;
          },
        ]
      >;
      const args = calls[0][0];
      expect(args.to).toBe('user@example.com');
      expect(args.subject).toBe('Welcome to Frontend Tales! 🎉');
      expect(args.html).toContain('John Doe');
      expect(args.text).toContain('John Doe');
    });

    it('should send a welcome email in Russian when the ru language is requested', async () => {
      mockMailProvider.send.mockResolvedValue(undefined);

      await service.sendWelcomeEmail('user@example.com', 'Иван Иванов', 'ru');

      expect(mockMailProvider.send).toHaveBeenCalledTimes(1);
      const calls = mockMailProvider.send.mock.calls as unknown as Array<
        [
          {
            to: string;
            subject: string;
            html: string;
            text: string;
          },
        ]
      >;
      const args = calls[0][0];
      expect(args.to).toBe('user@example.com');
      expect(args.subject).toBe('Добро пожаловать в Frontend Tales! 🎉');
      expect(args.html).toContain('Иван Иванов');
      expect(args.html).toContain('сообщество Frontend Tales');
      expect(args.text).toContain('Иван Иванов');
    });

    it('should retry sending on failure and succeed if a subsequent attempt passes', async () => {
      mockMailProvider.send
        .mockRejectedValueOnce(new Error('SMTP transient error'))
        .mockResolvedValueOnce(undefined);

      await service.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(mockMailProvider.send).toHaveBeenCalledTimes(2);
    });

    it('should log critical error after maximum retries are exhausted', async () => {
      mockMailProvider.send.mockRejectedValue(
        new Error('SMTP permanent error'),
      );

      const serviceWithLogger = service as unknown as {
        logger: { error: (message: string) => void };
      };
      const loggerSpy = jest.spyOn(serviceWithLogger.logger, 'error');

      await service.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(mockMailProvider.send).toHaveBeenCalledTimes(3);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Critical: Welcome email could not be sent to user@example.com',
        ),
      );
    });
  });
});
