import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TemplateService } from './template.service';
import {
  CreateTemplateDto,
  RenderTemplateDto,
} from './dto/create-template.dto';
import { AppLoggerService } from '../logger/app-logger.service';

@Controller('templates')
@ApiTags('Templates')
export class TemplateController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(TemplateController.name);
  }

  /**
   * POST /api/v1/templates
   * Create a new template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    type: CreateTemplateDto,
    examples: {
      emailVerification: {
        summary: 'Email Verification Template',
        value: {
          template_code: 'email_verification',
          version: 1,
          subject: 'Verify Your Email Address',
          body: 'Click the link below to verify your email: {link}',
          language: 'en',
        },
      },
      welcomePush: {
        summary: 'Welcome Push Notification',
        value: {
          template_code: 'welcome_push',
          version: 1,
          subject: 'Welcome to Our App',
          body: 'Welcome {name}! Start exploring our features today.',
          language: 'en',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Create a new template',
    description: 'Create a new notification template',
  })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    this.logger.log(`Creating template with code: ${dto.template_code}`);

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const data = await this.templateService.createTemplate(dto);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    return {
      success: true,
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      data,
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      message: 'Template created successfully',
      meta: {},
    };
  }

  /**
   * GET /api/v1/templates
   * Fetch all templates
   */
  @Get()
  @ApiOperation({
    summary: 'Fetch all templates',
    description: 'Retrieve all templates available in the system',
  })
  @ApiResponse({ status: 200, description: 'Templates fetched successfully' })
  async getAllTemplates() {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const data = await this.templateService.getAllTemplates();
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */

      return {
        success: true,
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        data,
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        message: 'Templates fetched successfully',
        meta: {},
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch templates: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message,
        message: 'Failed to fetch templates',
        meta: {},
      };
    }
  }

  /**
   * POST /api/v1/templates/render
   * Render a template with variables
   */
  @Post('render')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    type: RenderTemplateDto,
    examples: {
      renderExample: {
        summary: 'Render Template Example',
        value: {
          template_code: 'string',
          version: 0,
          variables: {
            additionalProp1: 'string',
            additionalProp2: 'string',
            additionalProp3: 'string',
          },
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Render a template',
    description: 'Render a template with provided variables',
  })
  @ApiResponse({ status: 200, description: 'Template rendered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async renderTemplate(@Body() dto: RenderTemplateDto) {
    try {
      this.logger.log(`Rendering template with code: ${dto.template_code}`);

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const data = await this.templateService.renderTemplate(dto);
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */

      return {
        success: true,
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        data,
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        message: 'Template rendered successfully',
        meta: {},
      };
    } catch (error) {
      this.logger.error(
        `Failed to render template: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message,
        message: 'Failed to render template',
        meta: {},
      };
    }
  }

  /**
   * GET /api/v1/templates/:template_code
   * Fetch a template by template_code
   */
  @Get(':template_code')
  @ApiOperation({
    summary: 'Fetch a template by code',
    description: 'Retrieve a template using its template_code path parameter',
  })
  @ApiResponse({ status: 200, description: 'Template fetched successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(@Param('template_code') template_code: string) {
    try {
      if (!template_code) {
        return {
          success: false,
          message: 'template_code path parameter is required',
          error: 'Missing template_code',
          meta: {},
        };
      }

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const data = await this.templateService.getTemplate(template_code);
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */

      return {
        success: true,
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        data,
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        message: 'Template fetched successfully',
        meta: {},
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch template: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message,
        message: 'Failed to fetch template',
        meta: {},
      };
    }
  }
}
