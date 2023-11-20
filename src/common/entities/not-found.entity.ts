import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class NotFoundEntity {
  @ApiProperty({
    example: HttpStatus.NOT_FOUND,
  })
  statusCode: number;

  /**
   * @example 'Cannot GET /v1/abc'
   */
  @ApiProperty()
  message: string;

  /**
   * @example 'Not Found'
   */
  @ApiProperty()
  error: string;
}
