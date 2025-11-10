import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
  use(req: any, res: any, next: () => void) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();

    // Set it on the request object for our app to use
    req.correlationId = correlationId;

    // Also attach it to the response headers
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
}
