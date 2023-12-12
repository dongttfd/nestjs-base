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
  resource: string,
) => {
  const swaggerConfig = new DocumentBuilder()
    .setTitle(appConfig?.swagger[resource]?.title || 'API documentation')
    .setDescription(
      appConfig?.swagger[resource]?.description || 'The API documentation',
    )
    .setVersion(appConfig?.swagger[resource]?.version || '0.0.0-dev')
    .addTag(appConfig?.swagger[resource]?.tag || 'API')
    .addBearerAuth({
      type: 'http',
      description: 'Enter JWT access token',
    })
    .build();

  const options: SwaggerCustomOptions = {
    customSiteTitle: appConfig?.swagger[resource]?.title || 'API documentation',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/assets/css/swagger.css',
  };

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  if (isProduction()) {
    app.use(
      ['/docs', '/docs-json'],
      basicAuth({
        challenge: true,
        users: {
          dongtt: '123456',
        },
      }),
    );
  }

  SwaggerModule.setup('docs', app, document, options);
};
