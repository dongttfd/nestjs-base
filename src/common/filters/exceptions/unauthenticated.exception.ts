import { UnauthorizedException } from '@nestjs/common';

export class UnauthenticatedException extends UnauthorizedException {
  constructor(objectOrError?: string | object, description?: string) {
    super(objectOrError, description || 'Unauthenticated');
  }
}
