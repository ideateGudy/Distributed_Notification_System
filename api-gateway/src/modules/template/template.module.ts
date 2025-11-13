import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [HttpModule, LoggerModule],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
