import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  const buildHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  };

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should serialize HttpException with string response', () => {
    const { host, status, json } = buildHost();
    filter.catch(new NotFoundException('not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: expect.any(String),
      }),
    );
  });

  it('should serialize HttpException with object response (message field)', () => {
    const { host, json } = buildHost();
    filter.catch(
      new BadRequestException({
        message: ['bad', 'worse'],
        error: 'Bad Request',
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['bad', 'worse'],
      }),
    );
  });

  it('should fall back to error field when message missing', () => {
    const { host, json } = buildHost();
    filter.catch(new BadRequestException({ error: 'oops' }), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'oops' }),
    );
  });

  it("should fall back to 'Unknown error' when neither message nor error present", () => {
    const { host, json } = buildHost();
    filter.catch(new BadRequestException({}), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Unknown error' }),
    );
  });

  it('should default to 500 + Internal server error for unknown errors', () => {
    const { host, status, json } = buildHost();
    jest
      .spyOn((filter as any).logger, 'error')
      .mockImplementation(() => undefined);

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });

  it('should map Prisma P2025 (not found) to 404 without leaking details', () => {
    const { host, status, json } = buildHost();
    jest
      .spyOn((filter as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const err = new Prisma.PrismaClientKnownRequestError(
      'No record found for a delete on table "Tag"',
      { code: 'P2025', clientVersion: '5.22.0' },
    );
    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      }),
    );
    // The raw Prisma message must not reach the client.
    expect(json).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Tag') }),
    );
  });

  it('should map Prisma P2002 (unique violation) to 409', () => {
    const { host, status, json } = buildHost();
    jest
      .spyOn((filter as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const err = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
    });
    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.CONFLICT }),
    );
  });

  it('should default unknown Prisma codes to 500', () => {
    const { host, status } = buildHost();
    jest
      .spyOn((filter as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const err = new Prisma.PrismaClientKnownRequestError('Some other error', {
      code: 'P2099',
      clientVersion: '5.22.0',
    });
    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should default to 500 + Internal server error for non-Error values', () => {
    const { host, status, json } = buildHost();
    filter.catch('string thrown', host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
