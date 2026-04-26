import { Reflector } from '@nestjs/core';
import { Public, IS_PUBLIC_KEY } from './public.decorator.js';

describe('Public decorator', () => {
  it('should attach IS_PUBLIC_KEY=true metadata to a target', () => {
    class Sample {
      @Public()
      method() {}
    }

    const reflector = new Reflector();
    const value = reflector.get(IS_PUBLIC_KEY, Sample.prototype.method);
    expect(value).toBe(true);
  });
});
