import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import { isProduction } from '@/common';

export const useSwaggerDocs = (
  appConfig: AppConfig,
  app: INestApplication,
) => {
  const swagger = appConfig.swagger;
  const swaggerConfig = new DocumentBuilder()
    .setTitle(swagger?.title || 'API documentation')
    .setDescription(swagger?.description || 'The API documentation')
    .setVersion(swagger?.version || '0.0.0-dev')
    .addTag(swagger?.tag || 'API')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT access token',
    })
    .build();

  const options: SwaggerCustomOptions = {
    customSiteTitle: swagger?.title || 'API documentation',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/assets/css/swagger.css',
  };

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  if (isProduction() && swagger?.authUserName && swagger?.authPassword) {
    app.use(
      ['/docs', '/docs-json'],
      basicAuth({
        challenge: true,
        users: {
          [swagger.authUserName]: swagger.authPassword,
        },
      }),
    );
  }

  SwaggerModule.setup('docs', app, document, options);
};
