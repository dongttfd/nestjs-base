import { ApiProperty } from '@nestjs/swagger';
import { CODES } from '@/config';

export class SuccessEntity<T> {
  /**
   * @example 2000
   */
  @ApiProperty()
  statusCode = CODES.SUCCESS;

  /**
   * @example 'success'
   */
  @ApiProperty()
  message = 'success';

  data?: T;

  constructor(data: T) {
    this.data = data;
  }
}
