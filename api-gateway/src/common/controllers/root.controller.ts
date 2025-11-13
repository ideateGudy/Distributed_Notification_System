import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('Root')
export class RootController {
  @Get()
  @ApiOperation({ summary: 'API Gateway status check' })
  @ApiResponse({
    status: 200,
    description: 'API Gateway is running',
    schema: {
      example: {
        success: true,
        message: 'API Gateway is running',
        data: {
          service: 'api-gateway',
          status: 'operational',
        },
        meta: {},
      },
    },
  })
  root() {
    return {
      success: true,
      message: 'API Gateway is running',
      data: {
        service: 'api-gateway',
        status: 'operational',
      },
      meta: {},
    };
  }
}
