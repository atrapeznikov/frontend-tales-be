import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy.js';
import { UsersService } from '../../users/users.service.js';

describe('GoogleStrategy', () => {
  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      const map: Record<string, string> = {
        GOOGLE_CLIENT_ID: 'gid',
        GOOGLE_CLIENT_SECRET: 'gsecret',
        GOOGLE_CALLBACK_URL: 'https://x/cb',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  let strategy: GoogleStrategy;
  let usersService: { findOrCreateByOAuth: jest.Mock };

  beforeEach(() => {
    usersService = { findOrCreateByOAuth: jest.fn() };
    strategy = new GoogleStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  it('should call done with user when profile has email', async () => {
    const user = { id: 'u1' };
    usersService.findOrCreateByOAuth.mockResolvedValue(user);
    const done = jest.fn();
    const profile = {
      id: 'gid-1',
      displayName: 'Alex',
      emails: [{ value: 'a@b.com' }],
      photos: [{ value: 'https://p.png' }],
    } as any;

    await strategy.validate('at', 'rt', profile, done);

    expect(usersService.findOrCreateByOAuth).toHaveBeenCalledWith({
      provider: 'GOOGLE',
      providerAccountId: 'gid-1',
      email: 'a@b.com',
      displayName: 'Alex',
      avatarUrl: 'https://p.png',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(done).toHaveBeenCalledWith(null, user);
  });

  it('should fall back to email as displayName when missing', async () => {
    usersService.findOrCreateByOAuth.mockResolvedValue({});
    const done = jest.fn();
    const profile = {
      id: 'gid-1',
      displayName: '',
      emails: [{ value: 'a@b.com' }],
    } as any;

    await strategy.validate('at', 'rt', profile, done);
    const arg = usersService.findOrCreateByOAuth.mock.calls[0][0];
    expect(arg.displayName).toBe('a@b.com');
  });

  it('should call done with error when profile has no email', async () => {
    const done = jest.fn();
    await strategy.validate('at', 'rt', { id: 'gid-1' } as any, done);
    expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
    expect(usersService.findOrCreateByOAuth).not.toHaveBeenCalled();
  });
});
