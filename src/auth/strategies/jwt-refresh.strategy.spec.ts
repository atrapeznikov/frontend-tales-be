import { ConfigService } from '@nestjs/config';
import { JwtRefreshStrategy } from './jwt-refresh.strategy.js';

describe('JwtRefreshStrategy', () => {
  const configService = {
    get: jest.fn().mockReturnValue('refresh-secret'),
  } as unknown as ConfigService;

  let strategy: JwtRefreshStrategy;

  beforeEach(() => {
    strategy = new JwtRefreshStrategy(configService);
  });

  it('should extract refresh token from cookie when present', () => {
    const req: any = { cookies: { refresh_token: 'cookie-rt' }, headers: {} };

    const result = strategy.validate(req, {
      sub: 'u1',
      email: 'a@b.com',
      role: 'USER',
    });

    expect(result).toEqual({
      id: 'u1',
      email: 'a@b.com',
      role: 'USER',
      refreshToken: 'cookie-rt',
    });
  });

  it('should fall back to Authorization header when no cookie', () => {
    const req: any = {
      cookies: {},
      headers: { authorization: 'Bearer header-rt' },
    };

    const result = strategy.validate(req, {
      sub: 'u1',
      email: 'a@b.com',
      role: 'USER',
    });

    expect(result.refreshToken).toBe('header-rt');
  });

  it('should return undefined refreshToken when neither source has it', () => {
    const req: any = { cookies: {}, headers: {} };

    const result = strategy.validate(req, {
      sub: 'u1',
      email: 'a@b.com',
      role: 'USER',
    });

    expect(result.refreshToken).toBeUndefined();
  });
});
