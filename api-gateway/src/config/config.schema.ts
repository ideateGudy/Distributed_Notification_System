// <reference lib="es2020" />
// This file validates our .env variables
// If a variable is missing or wrong, the app won't start.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { Logger } from '@nestjs/common';
import * as Joi from 'joi';

export const validate = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const schema = Joi.object({
    PORT: Joi.number().default(3000),
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),

    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().required(),

    USER_SERVICE_URL: Joi.string().uri().required(),
    TEMPLATE_SERVICE_URL: Joi.string().uri().required(),

    RABBITMQ_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required(),
  });

  const { error } = schema.validate(config, {
    // Allow extra env vars that aren't defined in our schema
    allowUnknown: true,
    // Validate all keys, not just the first error
    abortEarly: false,
  });

  if (error) {
    Logger.error('--- Environment variable validation error ---');
    Logger.error(error.message);
    process.exit(1);
  }

  return config;
};
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
