import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CaptchaService } from './captcha.service.js';

describe('CaptchaService', () => {
  let service: CaptchaService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptchaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CaptchaService>(CaptchaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('verify', () => {
    it('should return true when YANDEX_CAPTCHA_SECRET is not configured (dev bypass)', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.verify('any-token', '1.2.3.4');
      expect(result).toBe(true);
    });

    it('should return false when token is missing and secret is set', async () => {
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.verify(undefined, '1.2.3.4');
      expect(result).toBe(false);
    });

    it('should return false when token is not a string', async () => {
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.verify(123 as unknown as string, '1.2.3.4');
      expect(result).toBe(false);
    });

    it('should return true when Yandex returns ok status', async () => {
      mockConfigService.get.mockReturnValue('secret');
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'ok' }),
        } as Response);

      const result = await service.verify('token', '1.2.3.4');

      expect(fetchSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when fetch returns non-ok status', async () => {
      mockConfigService.get.mockReturnValue('secret');
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({}),
      } as Response);

      const result = await service.verify('token', '1.2.3.4');
      expect(result).toBe(false);
    });

    it('should return false when Yandex status is failed', async () => {
      mockConfigService.get.mockReturnValue('secret');
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'failed', message: 'spoofed' }),
      } as Response);

      const result = await service.verify('token', '1.2.3.4');
      expect(result).toBe(false);
    });

    it('should fail closed when fetch throws', async () => {
      mockConfigService.get.mockReturnValue('secret');
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

      const result = await service.verify('token', '1.2.3.4');
      expect(result).toBe(false);
    });

    it('should fail closed when fetch throws non-Error value', async () => {
      mockConfigService.get.mockReturnValue('secret');
      jest.spyOn(global, 'fetch').mockRejectedValue('weird');

      const result = await service.verify('token', '1.2.3.4');
      expect(result).toBe(false);
    });
  });
});
