import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  const buildContext = () =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(false);
      const user = { id: 'u1' };
      const result = guard.handleRequest(null, user, null, buildContext());
      expect(result).toBe(user);
    });

    it('should return null on public route when no user', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const result = guard.handleRequest(null, null, null, buildContext());
      expect(result).toBeNull();
    });

    it('should return null on public route when error occurs', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const result = guard.handleRequest(
        new Error('boom'),
        null,
        null,
        buildContext(),
      );
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException on protected route when user missing', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      expect(() =>
        guard.handleRequest(null, null, null, buildContext()),
      ).toThrow(UnauthorizedException);
    });

    it('should rethrow original error on protected route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const err = new Error('custom');
      expect(() =>
        guard.handleRequest(err, null, null, buildContext()),
      ).toThrow('custom');
    });
  });

  describe('canActivate', () => {
    it('should delegate to passport AuthGuard.canActivate', () => {
      const ctx = buildContext();
      const superSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true as any);

      const result = guard.canActivate(ctx);

      expect(superSpy).toHaveBeenCalledWith(ctx);
      expect(result).toBe(true);
    });
  });
});
