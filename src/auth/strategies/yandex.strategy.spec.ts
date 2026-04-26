import { ConfigService } from '@nestjs/config';
import { YandexStrategy } from './yandex.strategy.js';
import { UsersService } from '../../users/users.service.js';

describe('YandexStrategy', () => {
  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      const map: Record<string, string> = {
        YANDEX_CLIENT_ID: 'yid',
        YANDEX_CLIENT_SECRET: 'ysecret',
        YANDEX_CALLBACK_URL: 'https://x/cb',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  let strategy: YandexStrategy;
  let usersService: { findOrCreateByOAuth: jest.Mock };

  beforeEach(() => {
    usersService = { findOrCreateByOAuth: jest.fn() };
    strategy = new YandexStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  describe('validate', () => {
    it('should resolve user when profile has email', async () => {
      const user = { id: 'u1' };
      usersService.findOrCreateByOAuth.mockResolvedValue(user);
      const done = jest.fn();

      await strategy.validate(
        'at',
        'rt',
        {
          id: 'yid-1',
          displayName: 'Alex',
          emails: [{ value: 'a@b.com' }],
          photos: [{ value: 'https://av' }],
        },
        done,
      );

      expect(usersService.findOrCreateByOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'YANDEX',
          providerAccountId: 'yid-1',
          email: 'a@b.com',
          displayName: 'Alex',
          avatarUrl: 'https://av',
        }),
      );
      expect(done).toHaveBeenCalledWith(null, user);
    });

    it('should call done with error when no email', async () => {
      const done = jest.fn();
      await strategy.validate('at', 'rt', { id: 'yid-1' }, done);
      expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
    });

    it('should fall back to email as displayName', async () => {
      usersService.findOrCreateByOAuth.mockResolvedValue({});
      const done = jest.fn();

      await strategy.validate(
        'at',
        'rt',
        { id: 'yid-1', emails: [{ value: 'a@b.com' }] },
        done,
      );

      const arg = usersService.findOrCreateByOAuth.mock.calls[0][0];
      expect(arg.displayName).toBe('a@b.com');
    });
  });

  describe('userProfile', () => {
    it('should map yandex profile fields and call done with parsed object', () => {
      const oauth2Mock = {
        get: jest.fn(
          (
            _url: string,
            _token: string,
            cb: (err: any, body?: string) => void,
          ) => {
            cb(
              null,
              JSON.stringify({
                id: 'yid-1',
                display_name: 'Alex',
                default_email: 'a@b.com',
                default_avatar_id: 'avatar-id',
              }),
            );
          },
        ),
      };
      (strategy as any)._oauth2 = oauth2Mock;

      const done = jest.fn();
      strategy.userProfile('access', done);

      expect(done).toHaveBeenCalledWith(null, expect.objectContaining({
        id: 'yid-1',
        displayName: 'Alex',
        emails: [{ value: 'a@b.com' }],
        photos: [
          {
            value:
              'https://avatars.yandex.net/get-yapic/avatar-id/islands-200',
          },
        ],
      }));
    });

    it('should fall back to real_name then login when display_name missing', () => {
      const oauth2Mock = {
        get: jest.fn((_u: string, _t: string, cb: any) => {
          cb(
            null,
            JSON.stringify({
              id: 'yid-1',
              real_name: 'Real Alex',
              login: 'alex',
            }),
          );
        }),
      };
      (strategy as any)._oauth2 = oauth2Mock;
      const done = jest.fn();

      strategy.userProfile('access', done);
      expect(done.mock.calls[0][1].displayName).toBe('Real Alex');
    });

    it('should produce empty emails and photos arrays when missing', () => {
      const oauth2Mock = {
        get: jest.fn((_u: string, _t: string, cb: any) => {
          cb(null, JSON.stringify({ id: 'yid-1', login: 'alex' }));
        }),
      };
      (strategy as any)._oauth2 = oauth2Mock;
      const done = jest.fn();

      strategy.userProfile('access', done);

      expect(done.mock.calls[0][1].emails).toEqual([]);
      expect(done.mock.calls[0][1].photos).toEqual([]);
      expect(done.mock.calls[0][1].displayName).toBe('alex');
    });

    it('should propagate fetch error', () => {
      const err = new Error('http fail');
      const oauth2Mock = {
        get: jest.fn((_u: string, _t: string, cb: any) => cb(err)),
      };
      (strategy as any)._oauth2 = oauth2Mock;
      const done = jest.fn();

      strategy.userProfile('access', done);
      expect(done).toHaveBeenCalledWith(err);
    });

    it('should propagate JSON parse error', () => {
      const oauth2Mock = {
        get: jest.fn((_u: string, _t: string, cb: any) => cb(null, 'not json')),
      };
      (strategy as any)._oauth2 = oauth2Mock;
      const done = jest.fn();

      strategy.userProfile('access', done);
      expect(done).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
