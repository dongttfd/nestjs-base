import { Environment } from './environment';

export const configApp = (): AppConfig => ({
  apiHost: process.env.HOST || '0.0.0.0',
  apiPort: parseInt(process.env.PORT) || 3000,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT) || 6379,
  cache: process.env.NODE_ENV === Environment.PRODUCTION,
  bodyJsonSizeLimit: '10mb',
  database: {
    driver: process.env.DATABASE_DRIVER || 'mysql',
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT, 0) || 3306,
      db: process.env.MYSQL_DB || 'db',
      username: process.env.MYSQL_USERNAME || '',
      password: process.env.MYSQL_PASSWORD || '',
    },
    mongo: {
      host: process.env.MONGO_HOST || 'localhost',
      port: parseInt(process.env.MONGO_PORT, 0) || 27017,
      db: process.env.MONGO_DB || 'db',
      username: process.env.MONGO_USERNAME || '',
      password: process.env.MONGO_PASSWORD || '',
    },
  },
  swagger: {
    title: 'API documentation',
    description: 'The API documentation',
    tag: 'API list',
    authUserName: process.env.SWAGGER_AUTH_USERNAME || undefined,
    authPassword: process.env.SWAGGER_AUTH_PASSWORD || undefined,
    version: process.env.VERSION || '0.0.0-dev',
  },
  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT, 0) || 587,
    username: process.env.MAIL_USERNAME || '',
    password: process.env.MAIL_PASSWORD || '',
    defaultMail: process.env.MAIL_DEFAULT_MAIL || 'hi@example.com',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    expiration: process.env.JWT_EXPIRATION || '60s',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'secretRefreshKey',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
});
