// <reference lib="es2020" />
// This file validates our .env variables
// If a variable is missing or wrong, the app won't start.
import * as Joi from 'joi';
import { appLogger } from '../modules/logger/winston.config';

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
    USER_SERVICE_BASE_URL: Joi.string().uri().required(),
    TEMPLATE_SERVICE_BASE_URL: Joi.string().uri().required(),
    EMAIL_SERVICE_BASE_URL: Joi.string().uri().required(),
    PUSH_SERVICE_BASE_URL: Joi.string().uri().required(),

    RABBITMQ_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required(),
    REDIS_KEY_EXPIRATION_MILLISECONDS: Joi.number().default(86400000),
  });

  const { error } = schema.validate(config, {
    // Allow extra env vars that aren't defined in our schema
    allowUnknown: true,
    // Validate all keys, not just the first error
    abortEarly: false,
  });

  if (error) {
    appLogger.error('--- Environment variable validation error ---');
    appLogger.error(error.message);
    process.exit(1);
  }

  return config;
};
