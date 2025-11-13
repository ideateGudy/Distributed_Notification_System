import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppLoggerService } from '../logger/app-logger.service';
import { ConfigService } from '@nestjs/config';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplateService {
  // Base URL for the template service. The service will talk to /templates endpoints.
  private base: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.base = this.configService.get<string>('services.template')!;
  }

  /**
   * Create a new template on the template service.
   * POST to base URL with template metadata.
   */
  async createTemplate(payload: CreateTemplateDto) {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-return */
      const res = await firstValueFrom(
        this.httpService.post(`${this.base}/`, payload),
      );
      this.logger.log(`Create template response: ${JSON.stringify(res.data)}`);
      // The remote service returns the created template directly
      return res.data;
      /* eslint-enable @typescript-eslint/no-unsafe-return */
    } catch (error) {
      this.logger.error(
        `Failed to create template: ${(error as Error).message}`,
      );
      // Extract error details from remote service response
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as Record<string, any>).response
      ) {
        const response = (error as Record<string, any>).response;
        const status = response.status || HttpStatus.BAD_GATEWAY;
        const data = response.data;
        this.logger.error(
          `Remote template service error: ${JSON.stringify(data)}`,
        );
        throw new HttpException(
          data as string | Record<string, any>,
          status as number,
        );
      }
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
      throw new HttpException(
        'Template service unavailable or failed to create template',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Render a template using the template service (post render endpoint).
   */
  async renderTemplate(payload: Record<string, any>) {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-return */
      const res = await firstValueFrom(
        this.httpService.post(`${this.base}/render`, payload),
      );
      return res.data;
      /* eslint-enable @typescript-eslint/no-unsafe-return */
    } catch (error) {
      this.logger.error(
        `Failed to render template: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Template service unavailable or template not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Fetch template metadata/body by id.
   */
  async getTemplate(template_code: string) {
    try {
      this.logger.log(
        `Fetching template ${template_code} from Template service`,
      );
      /* eslint-disable @typescript-eslint/no-unsafe-return */
      const result = await firstValueFrom(
        this.httpService.get(`${this.base}/${template_code}`),
      );
      this.logger.log(
        `Template ${template_code} fetched successfully..... ${JSON.stringify(result?.data)}`,
      );
      // Assuming Template service returns { success: true, data: { ... } }
      return result.data;
      /* eslint-enable @typescript-eslint/no-unsafe-return */
    } catch (error) {
      this.logger.error(
        `Failed to fetch template ${template_code}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Template service unavailable or template not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Fetch all templates metadata/body.
   */
  async getAllTemplates() {
    try {
      this.logger.log(`Fetching all templates from Template service`);
      /* eslint-disable @typescript-eslint/no-unsafe-return */
      const result = await firstValueFrom(this.httpService.get(`${this.base}`));
      this.logger.log(
        `All templates fetched successfully..... ${JSON.stringify(result?.data)}`,
      );
      // Assuming Template service returns { success: true, data: [ ... ] }
      return result.data;
      /* eslint-enable @typescript-eslint/no-unsafe-return */
    } catch (error) {
      this.logger.error(
        `Failed to fetch all templates: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Template service unavailable or templates not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
