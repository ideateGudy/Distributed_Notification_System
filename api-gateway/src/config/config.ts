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
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchange: 'notifications.direct',
  },

  redis: {
    url: process.env.REDIS_URL,
  },
});
