import { HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';
import {
  BadRequestEntity,
  InternalServerErrorEntity,
  NotFoundEntity,
  UnauthenticatedEntity,
  UnauthorizedEntity,
} from '@/common';

/**
 * Custom nestjs swagger decorator
 */
export const ApiBadRequestResponse = (
  options: ApiResponseOptions = { type: BadRequestEntity },
) => ApiResponse({ ...options, status: HttpStatus.BAD_REQUEST });

export const ApiInternalServerErrorResponse = (
  options: ApiResponseOptions = { type: InternalServerErrorEntity },
) => ApiResponse({ ...options, status: HttpStatus.INTERNAL_SERVER_ERROR });

export const ApiNotFoundResponse = (
  options: ApiResponseOptions = { type: NotFoundEntity },
) => ApiResponse({ ...options, status: HttpStatus.NOT_FOUND });

export const ApiUnauthenticatedResponse = (
  options: ApiResponseOptions = { type: UnauthenticatedEntity },
) => ApiResponse({ ...options, status: HttpStatus.UNAUTHORIZED });

export const ApiUnauthorizedResponse = (
  options: ApiResponseOptions = { type: UnauthorizedEntity },
) => ApiResponse({ ...options, status: HttpStatus.FORBIDDEN });
