import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestException extends HttpException {
  constructor(
    objectOrError?: '',
    description?: string,
    code: number = HttpStatus.TOO_MANY_REQUESTS,
  ) {
    super(
      HttpException.createBody(objectOrError, description, code),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
