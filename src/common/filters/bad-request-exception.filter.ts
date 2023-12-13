import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { CODES } from '@/config';

@Catch(BadRequestException)
export class BadRequestExceptionFilter extends BaseExceptionFilter<BadRequestException> {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    let status = exception.getStatus();
    const responseBody = exception.getResponse() as BaseResponse<unknown>;

    const res: BaseResponse<unknown> = {
      statusCode:
        responseBody.statusCode === HttpStatus.BAD_REQUEST
          ? CODES.ERROR_CODE
          : responseBody.statusCode,
      message: 'Unknown error',
      error: 'Bad Request',
    };

    const contexts = responseBody.message[0]
      ? responseBody.message[0]['contexts']
      : undefined;

    if (contexts) {
      status = contexts[Object.keys(contexts)[0]]?.httpStatus || status;
      res.statusCode = contexts[Object.keys(contexts)[0]]?.statusCode;
    }

    const constraints = responseBody.message[0]
      ? responseBody.message[0]['constraints']
      : undefined;
    res.message = constraints
      ? constraints[Object.keys(constraints)[0]]
      : responseBody.message;

    if (res.message[0] && res.message[0]['children']) {
      const childrenError =
        res.message[0]['children'][0]['children'][0]['constraints'];
      res.message = childrenError
        ? childrenError[Object.keys(childrenError)[0]]
        : res.message;
    }

    response.status(status).json(res);
  }
}
