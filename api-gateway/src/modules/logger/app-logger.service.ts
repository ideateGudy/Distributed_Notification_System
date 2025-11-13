import { Injectable, Inject, Scope } from '@nestjs/common';
import { Logger } from 'winston';

// make it request- or context-scoped only if you want different prefixes per instance
@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService {
  private context?: string;

  constructor(@Inject('LOGGER') private readonly logger: Logger) {}

  /**
   * Set a custom prefix (context) for this logger instance
   */
  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(message: string) {
    return this.context ? `[${this.context}] ${message}` : message;
  }

  log(message: string, meta?: any) {
    this.logger.info(this.formatMessage(message), meta);
  }

  info(message: string, meta?: any) {
    this.logger.info(this.formatMessage(message), meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(this.formatMessage(message), meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(this.formatMessage(message), meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(this.formatMessage(message), meta);
  }

  verbose(message: string, meta?: any) {
    this.logger.verbose(this.formatMessage(message), meta);
  }
}
