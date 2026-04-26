import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';
import { UsersService } from '../../users/users.service.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };
  const configService = {
    get: jest.fn().mockReturnValue('access-secret'),
  } as unknown as ConfigService;

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    strategy = new JwtStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should return user payload when user is found', async () => {
    usersService.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      role: 'USER',
      displayName: 'Alex',
    });

    const result = await strategy.validate({
      sub: 'u1',
      email: 'a@b.com',
      role: 'USER',
    });

    expect(usersService.findById).toHaveBeenCalledWith('u1');
    expect(result).toEqual({
      id: 'u1',
      email: 'a@b.com',
      role: 'USER',
      displayName: 'Alex',
    });
  });

  it('should throw UnauthorizedException when user not found', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'u1', email: 'a@b.com', role: 'USER' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
