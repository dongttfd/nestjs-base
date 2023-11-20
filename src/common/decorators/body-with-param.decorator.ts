import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  Type,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export const BodyWithParam = createParamDecorator(
  async (dto: Type, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const object = { ...request.body, ...request.params };
    const dtoInstance = plainToInstance(dto, object);
    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return object;
  },
);
