import { Reflector } from '@nestjs/core';
import { Roles, ROLES_KEY } from './roles.decorator.js';

describe('Roles decorator', () => {
  it('should attach the provided roles list under ROLES_KEY', () => {
    class Sample {
      @Roles('ADMIN', 'EDITOR')
      method() {}
    }

    const reflector = new Reflector();
    const value = reflector.get<string[]>(ROLES_KEY, Sample.prototype.method);
    expect(value).toEqual(['ADMIN', 'EDITOR']);
  });

  it('should attach an empty list when no roles passed', () => {
    class Sample {
      @Roles()
      method() {}
    }

    const reflector = new Reflector();
    const value = reflector.get<string[]>(ROLES_KEY, Sample.prototype.method);
    expect(value).toEqual([]);
  });
});
