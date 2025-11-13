import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { caseConverter } from '../utils/case-converter';
import { appLogger } from '../../modules/logger/winston.config';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    appLogger.error(
      `Status ${status} Error: ${exception.message}`,
      exception.stack,
    );

    // Get the raw error response
    const errorResponse = exception.getResponse();

    // If the error response already has a 'detail' field (from remote service validation),
    // or is already an array, pass it through as-is
    if (
      (typeof errorResponse === 'object' &&
        ((errorResponse as any).detail !== undefined ||
          Array.isArray(errorResponse))) ||
      (typeof errorResponse === 'object' &&
        (errorResponse as any).status &&
        (errorResponse as any).timestamp)
    ) {
      response.status(status).send(errorResponse);
      return;
    }

    // Format it as per project spec for standard errors
    const standardError = {
      success: false,
      message:
        typeof errorResponse === 'string'
          ? errorResponse
          : (errorResponse as any).message || 'An error occurred',
      error:
        (typeof errorResponse === 'object' && (errorResponse as any).error) ||
        HttpStatus[status] ||
        'Internal Server Error',

      // Also include validation errors if they exist
      details:
        (typeof errorResponse === 'object' && (errorResponse as any).message) ||
        undefined,
    };

    // Convert keys to snake_case
    const snakeCaseError = caseConverter.toSnakeCase(standardError);

    response.status(status).send(snakeCaseError);
  }
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
}
