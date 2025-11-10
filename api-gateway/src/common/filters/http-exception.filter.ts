import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { caseConverter } from '../utils/case-converter';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    // Get the correlation ID
    const correlationId = request.headers['x-correlation-id'] || 'unknown';

    this.logger.error(
      `[${correlationId}] Status ${status} Error: ${exception.message}`,
      exception.stack,
    );

    // Get the raw error response
    const errorResponse = exception.getResponse();

    // Format it as per project spec
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
