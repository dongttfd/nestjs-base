import {
  BadRequestException,
  INestApplication,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer, ValidationError } from 'class-validator';
import * as bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

import { configApp, cors } from '@/config';
import { getLogLevels } from '@/common';
import { useWebSocket } from './socket';
import { useSwaggerDocs } from './swagger';

expand(dotenv.config());
const appConfig = configApp();

const useValidation = (app: INestApplication, module: Type) => {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException(errors),
    }),
  );

  useContainer(app.select(module), { fallbackOnErrors: true });
};

export default async (module: Type, includeSocket = false) => {
  const app = await NestFactory.create<NestExpressApplication>(module, {
    logger: getLogLevels(),
  });

  const resource = module.name.replace('Module', '').toLowerCase();

  // prefix resource wit module
  app.setGlobalPrefix(`${resource}/`, { exclude: [`/${resource}`] });

  // use swagger api document
  useSwaggerDocs(appConfig, app, resource);

  // use validation
  useValidation(app, module);

  // enable cors and json for express
  app.use(bodyParser.json({ limit: appConfig.bodyJsonSizeLimit }));
  app.enableCors(cors);

  // start with websocket
  if (includeSocket) {
    useWebSocket(app);
  }

  // get port
  const port = appConfig[`${resource}Port`];

  await app.listen(
    port,
    // eslint-disable-next-line no-console
    () => console.log(`${resource} listening on port ${port}`),
  );
};
