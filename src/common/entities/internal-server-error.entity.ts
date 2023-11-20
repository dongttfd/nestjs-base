import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class InternalServerErrorEntity {
  @ApiProperty({
    example: HttpStatus.INTERNAL_SERVER_ERROR,
  })
  statusCode: number;

  /**
   * @example 'Internal server error'
   */
  @ApiProperty()
  message: string;

  /**
   * @example 'Server error'
   */
  @ApiProperty()
  error: string;
}
