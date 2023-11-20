import { ForbiddenException } from '@nestjs/common';

export class UnauthorizedException extends ForbiddenException {
  constructor(objectOrError?: string | object, description?: string) {
    super(
      objectOrError || 'Unauthorized',
      description || 'You have no permission to access this resource',
    );
  }
}
