// This file centralizes all config variables

export default () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  services: {
    user: process.env.USER_SERVICE_URL,
    template: process.env.TEMPLATE_SERVICE_URL,
    userBase: process.env.USER_SERVICE_BASE_URL,
    templateBase: process.env.TEMPLATE_SERVICE_BASE_URL,
    emailBase: process.env.EMAIL_SERVICE_BASE_URL,
    pushBase: process.env.PUSH_SERVICE_BASE_URL,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchange: 'notifications.direct',
  },

  redis: {
    url: process.env.REDIS_URL,
    keyExpirationMilliseconds: process.env.REDIS_KEY_EXPIRATION_MILLISECONDS
      ? parseInt(process.env.REDIS_KEY_EXPIRATION_MILLISECONDS, 10)
      : 86400000, // default to 1 day
    upstash: {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
  },
});
