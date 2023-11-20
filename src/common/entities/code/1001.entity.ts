import { ApiProperty } from '@nestjs/swagger';
import { CODES } from '@/config';

export class EmailWasUsedEntity {
  @ApiProperty({
    example: CODES.EMAIL_WAS_USED,
  })
  statusCode: number;

  /**
   * @example 'Email was used'
   */
  @ApiProperty()
  message: string;

  /**
   * @example 'Bad request'
   */
  @ApiProperty()
  error: string;
}
