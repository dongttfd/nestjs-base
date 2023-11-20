import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class UnauthorizedEntity {
  @ApiProperty({
    example: HttpStatus.FORBIDDEN
  })
  statusCode: number;

  /**
   * @example 'Unauthorized'
   */
  @ApiProperty()
  message: string;

  /**
   * @example 'You have no permission to access this resource'
   */
  @ApiProperty()
  error: string;
}
