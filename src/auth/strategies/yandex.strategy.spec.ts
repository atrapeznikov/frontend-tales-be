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

  describe('constructor', () => {
    it('should use default scopes when YANDEX_SCOPES is not configured', () => {
      expect((strategy as any)._scope).toEqual([
        'login:email',
        'login:info',
        'login:avatar',
      ]);
    });

    it('should parse custom scopes from YANDEX_SCOPES environment variable', () => {
      const customConfig = {
        get: jest.fn().mockImplementation((key: string) => {
          const map: Record<string, string> = {
            YANDEX_CLIENT_ID: 'yid',
            YANDEX_CLIENT_SECRET: 'ysecret',
            YANDEX_CALLBACK_URL: 'https://x/cb',
            YANDEX_SCOPES: 'login:email, login:info',
          };
          return map[key];
        }),
      } as unknown as ConfigService;

      const customStrategy = new YandexStrategy(
        customConfig,
        usersService as unknown as UsersService,
      );

      expect((customStrategy as any)._scope).toEqual([
        'login:email',
        'login:info',
      ]);
    });
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
    let originalFetch: typeof global.fetch;

    beforeAll(() => {
      originalFetch = global.fetch;
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('should map yandex profile fields and call done with parsed object', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'yid-1',
          display_name: 'Alex',
          default_email: 'a@b.com',
          default_avatar_id: 'avatar-id',
        }),
      });

      const done = jest.fn();
      strategy.userProfile('access', done);

      await new Promise(process.nextTick);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://login.yandex.ru/info?format=json',
        expect.objectContaining({
          headers: {
            Authorization: 'OAuth access',
          },
        }),
      );

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          id: 'yid-1',
          displayName: 'Alex',
          emails: [{ value: 'a@b.com' }],
          photos: [
            {
              value:
                'https://avatars.yandex.net/get-yapic/avatar-id/islands-200',
            },
          ],
        }),
      );
    });

    it('should fall back to real_name then login when display_name missing', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'yid-1',
          real_name: 'Real Alex',
          login: 'alex',
        }),
      });
      const done = jest.fn();

      strategy.userProfile('access', done);
      await new Promise(process.nextTick);

      expect(done.mock.calls[0][1].displayName).toBe('Real Alex');
    });

    it('should produce empty emails and photos arrays when missing', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'yid-1', login: 'alex' }),
      });
      const done = jest.fn();

      strategy.userProfile('access', done);
      await new Promise(process.nextTick);

      expect(done.mock.calls[0][1].emails).toEqual([]);
      expect(done.mock.calls[0][1].photos).toEqual([]);
      expect(done.mock.calls[0][1].displayName).toBe('alex');
    });

    it('should propagate fetch error', async () => {
      const err = new Error('http fail');
      global.fetch = jest.fn().mockRejectedValue(err);
      const done = jest.fn();

      strategy.userProfile('access', done);
      await new Promise(process.nextTick);

      expect(done).toHaveBeenCalledWith(err);
    });

    it('should propagate JSON parse error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('invalid json');
        },
      });
      const done = jest.fn();

      strategy.userProfile('access', done);
      await new Promise(process.nextTick);

      expect(done).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
