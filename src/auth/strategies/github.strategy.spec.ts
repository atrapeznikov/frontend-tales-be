import { ConfigService } from '@nestjs/config';
import { GithubStrategy } from './github.strategy.js';
import { UsersService } from '../../users/users.service.js';

describe('GithubStrategy', () => {
  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      const map: Record<string, string> = {
        GITHUB_CLIENT_ID: 'cid',
        GITHUB_CLIENT_SECRET: 'csecret',
        GITHUB_CALLBACK_URL: 'https://x/cb',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  let strategy: GithubStrategy;
  let usersService: { findOrCreateByOAuth: jest.Mock };

  beforeEach(() => {
    usersService = { findOrCreateByOAuth: jest.fn() };
    strategy = new GithubStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  it('should call done with user when profile has email', async () => {
    const user = { id: 'u1' };
    usersService.findOrCreateByOAuth.mockResolvedValue(user);
    const done = jest.fn();

    await strategy.validate(
      'at',
      'rt',
      {
        id: 'gh-1',
        username: 'alex',
        displayName: 'Alex',
        emails: [{ value: 'a@b.com' }],
        photos: [{ value: 'https://p' }],
      } as any,
      done,
    );

    expect(usersService.findOrCreateByOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'GITHUB',
        providerAccountId: 'gh-1',
        email: 'a@b.com',
        displayName: 'Alex',
        avatarUrl: 'https://p',
      }),
    );
    expect(done).toHaveBeenCalledWith(null, user);
  });

  it('should fall back to username when displayName missing', async () => {
    usersService.findOrCreateByOAuth.mockResolvedValue({});
    const done = jest.fn();

    await strategy.validate(
      'at',
      'rt',
      {
        id: 'gh-1',
        displayName: '',
        username: 'alex',
        emails: [{ value: 'a@b.com' }],
      } as any,
      done,
    );

    const arg = usersService.findOrCreateByOAuth.mock.calls[0][0];
    expect(arg.displayName).toBe('alex');
  });

  it('should fall back to email when displayName and username missing', async () => {
    usersService.findOrCreateByOAuth.mockResolvedValue({});
    const done = jest.fn();

    await strategy.validate(
      'at',
      'rt',
      {
        id: 'gh-1',
        emails: [{ value: 'a@b.com' }],
      } as any,
      done,
    );

    const arg = usersService.findOrCreateByOAuth.mock.calls[0][0];
    expect(arg.displayName).toBe('a@b.com');
  });

  it('should call done with error when no email', async () => {
    const done = jest.fn();
    await strategy.validate('at', 'rt', { id: 'gh-1' } as any, done);
    expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
  });
});
