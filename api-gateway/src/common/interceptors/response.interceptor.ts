import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { caseConverter } from '../utils/case-converter';

export interface StandardResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: any; // PaginationMeta
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // data can be { data: {...}, message: "..." } or just { ... }
        const responseData = data?.data || data;
        const message = data?.message || 'Request successful';
        const meta = data?.meta || undefined;

        // Per project spec, convert all response keys to snake_case
        const snakeCaseData = caseConverter.toSnakeCase(responseData);

        return {
          success: true,
          message: message,
          data: snakeCaseData,
          ...(meta && { meta: meta }), // Add meta only if it exists
        };
      }),
    );
  }
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
}
