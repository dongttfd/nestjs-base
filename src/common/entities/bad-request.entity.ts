import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { CODES } from '@/config';
import { EmailWasUsedEntity } from './code';

@ApiExtraModels(EmailWasUsedEntity)
export class BadRequestEntity {
  @ApiProperty({
    example: CODES.ERROR_CODE,
  })
  statusCode: number;

  /**
   * @example 'Unknown error'
   */
  @ApiProperty()
  message: string;

  /**
   * @example 'Bad request'
   */
  @ApiProperty()
  error: string;
}
