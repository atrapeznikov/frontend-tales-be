import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (responseObj.message as string | string[]) ||
          (responseObj.error as string) ||
          'Unknown error';
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map known Prisma errors to proper HTTP statuses so e.g. an update/delete
      // of a missing row returns 404 instead of a generic 500. We never echo the
      // Prisma message/meta to the client (it can reveal schema internals) — only
      // a safe, generic message — but we log the details server-side.
      const mapped = this.mapPrismaError(exception.code);
      status = mapped.status;
      message = mapped.message;
      this.logger.warn(
        `Prisma error ${exception.code}: ${exception.message.replace(/\n/g, ' ')}`,
      );
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private mapPrismaError(code: string): {
    status: HttpStatus;
    message: string;
  } {
    switch (code) {
      case 'P2025': // Record to update/delete not found
        return { status: HttpStatus.NOT_FOUND, message: 'Resource not found' };
      case 'P2002': // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
        };
      case 'P2003': // Foreign key constraint failed
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to a related resource',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        };
    }
  }
}
