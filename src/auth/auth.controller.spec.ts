import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Reflector } from '@nestjs/core';
import { CaptchaService } from './captcha/captcha.service.js';
import { RedisService } from '../redis/redis.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    createOAuthCode: jest.fn(),
    exchangeOAuthCode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        FRONTEND_URL: 'https://frontend.example',
        NODE_ENV: 'production',
      };
      return map[key];
    }),
  };

  const buildRes = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Reflector, useValue: {} },
        { provide: CaptchaService, useValue: {} },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should set refresh cookie and return access token', async () => {
      mockAuthService.register.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
      const res = buildRes();

      const result = await controller.register(
        { email: 'a@b.com', password: 'pw', displayName: 'Alex' },
        res as any,
      );

      expect(mockAuthService.register).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'r',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/api/auth',
        }),
      );
      expect(result).toEqual({ accessToken: 'a' });
    });

    it('should set secure=false in non-production', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });
      mockAuthService.register.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
      const res = buildRes();

      await controller.register(
        { email: 'a@b.com', password: 'pw', displayName: 'Alex' },
        res as any,
      );

      const cookieOpts = res.cookie.mock.calls[0][2];
      expect(cookieOpts.secure).toBe(false);
    });
  });

  describe('login', () => {
    it('should set refresh cookie and return access token', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
      const res = buildRes();

      const result = await controller.login(
        { email: 'a@b.com', password: 'pw' },
        res as any,
      );

      expect(mockAuthService.login).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'r',
        expect.any(Object),
      );
      expect(result).toEqual({ accessToken: 'a' });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and set new cookie', async () => {
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'a2',
        refreshToken: 'r2',
      });
      const res = buildRes();

      const result = await controller.refresh(
        {
          id: 'u1',
          email: 'a@b.com',
          role: 'USER',
          refreshToken: 'rt',
        },
        res as any,
      );

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('u1', 'rt');
      expect(res.cookie).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'a2' });
    });
  });

  describe('logout', () => {
    it('should clear cookie and call service.logout', async () => {
      const res = buildRes();
      const result = await controller.logout('u1', res as any);

      expect(mockAuthService.logout).toHaveBeenCalledWith('u1');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getMe', () => {
    it('should return the user passed in', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        role: 'USER',
        displayName: 'Alex',
      };
      const result = await controller.getMe(user);
      expect(result).toBe(user);
    });
  });

  describe('exchangeOAuthCode', () => {
    it('should exchange code and set cookie', async () => {
      mockAuthService.exchangeOAuthCode.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
      const res = buildRes();

      const result = await controller.exchangeOAuthCode('code', res as any);

      expect(mockAuthService.exchangeOAuthCode).toHaveBeenCalledWith('code');
      expect(res.cookie).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'a' });
    });
  });

  describe('OAuth login redirect endpoints', () => {
    it('googleLogin should be a no-op', () => {
      expect(controller.googleLogin()).toBeUndefined();
    });

    it('githubLogin should be a no-op', () => {
      expect(controller.githubLogin()).toBeUndefined();
    });

    it('yandexLogin should be a no-op', () => {
      expect(controller.yandexLogin()).toBeUndefined();
    });
  });

  describe('OAuth callbacks', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          FRONTEND_URL: 'https://frontend.example',
          NODE_ENV: 'production',
        };
        return map[key];
      });
    });

    it('googleCallback should redirect with single-use code', async () => {
      mockAuthService.createOAuthCode.mockResolvedValue('oauth-code');
      const res = buildRes();
      const req = { user: { id: 'u1' } };

      await controller.googleCallback(req as any, res as any);

      expect(mockAuthService.createOAuthCode).toHaveBeenCalledWith('u1');
      expect(res.redirect).toHaveBeenCalledWith(
        'https://frontend.example/auth/callback?code=oauth-code',
      );
    });

    it('githubCallback should redirect with single-use code', async () => {
      mockAuthService.createOAuthCode.mockResolvedValue('gh-code');
      const res = buildRes();
      const req = { user: { id: 'u2' } };

      await controller.githubCallback(req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(
        'https://frontend.example/auth/callback?code=gh-code',
      );
    });

    it('yandexCallback should redirect with single-use code', async () => {
      mockAuthService.createOAuthCode.mockResolvedValue('y-code');
      const res = buildRes();
      const req = { user: { id: 'u3' } };

      await controller.yandexCallback(req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(
        'https://frontend.example/auth/callback?code=y-code',
      );
    });
  });
});
