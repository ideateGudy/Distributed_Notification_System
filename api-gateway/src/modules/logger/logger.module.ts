import { Global, Module } from '@nestjs/common';
import { appLogger } from './winston.config';
import { AppLoggerService } from './app-logger.service';

@Global()
@Module({
  providers: [{ provide: 'LOGGER', useValue: appLogger }, AppLoggerService],
  exports: ['LOGGER', AppLoggerService],
})
export class LoggerModule {}
