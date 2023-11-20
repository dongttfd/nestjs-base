import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class UnauthenticatedEntity {
  @ApiProperty({
    example: HttpStatus.UNAUTHORIZED
  })
  statusCode: number;

  /**
   * @example 'Unauthenticated'
   */
  @ApiProperty()
  message: string;
}
