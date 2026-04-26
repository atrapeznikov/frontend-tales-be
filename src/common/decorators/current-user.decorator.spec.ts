import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator.js';

function getDecoratorFactory(): (
  data: string | undefined,
  ctx: ExecutionContext,
) => unknown {
  class Test {
    test(@CurrentUser() _user: unknown) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
  const key = Object.keys(args)[0];
  return args[key].factory;
}

const buildContext = (user: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('CurrentUser decorator', () => {
  const factory = getDecoratorFactory();

  it('should return entire user when no data key passed', () => {
    const user = { id: 'u1', email: 'a@b.com' };
    expect(factory(undefined, buildContext(user))).toBe(user);
  });

  it('should return user property when data key passed', () => {
    const user = { id: 'u1' };
    expect(factory('id', buildContext(user))).toBe('u1');
  });

  it('should return undefined when user is missing', () => {
    expect(factory('id', buildContext(undefined))).toBeUndefined();
  });

  it('should return undefined when user is missing and no key', () => {
    expect(factory(undefined, buildContext(undefined))).toBeUndefined();
  });
});
