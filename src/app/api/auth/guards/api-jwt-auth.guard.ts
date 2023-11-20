import { applyDecorators, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiUnauthenticatedResponse } from '@/common';
import { API_JWT_GUARD_NAME } from '@/config';

@Injectable()
export class ApiJwtAuthGuard extends AuthGuard(API_JWT_GUARD_NAME) {}

export const ApiAuthGuard = () =>
  applyDecorators(
    UseGuards(ApiJwtAuthGuard),
    ApiBearerAuth(),
    ApiUnauthenticatedResponse(),
  );
