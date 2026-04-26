import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor.js';

describe('TransformInterceptor', () => {
  it('should wrap response with statusCode, data, and timestamp', async () => {
    const interceptor = new TransformInterceptor<unknown>();

    const ctx = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 201 }),
      }),
    } as unknown as ExecutionContext;

    const handler: CallHandler = { handle: () => of({ id: 'a1' }) };

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result.statusCode).toBe(201);
    expect(result.data).toEqual({ id: 'a1' });
    expect(typeof result.timestamp).toBe('string');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('should preserve different statusCodes from the response', async () => {
    const interceptor = new TransformInterceptor<unknown>();

    const ctx = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;

    const handler: CallHandler = { handle: () => of('value') };

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result.statusCode).toBe(200);
    expect(result.data).toBe('value');
  });
});
