import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class UserEntity {
  /**
   * @example '000000000-0000-0000-0000-000000000000'
   */
  @ApiProperty()
  id: string;

  /**
   * @example 'example@domain'
   */
  @ApiProperty()
  email: string;

  /**
   * @example '0368368368'
   */
  @ApiProperty()
  phone: string;

  /**
   * @example 'John'
   */
  @ApiProperty()
  name: string;

  constructor(user: Partial<User>) {
    this.id = user.id;
    this.email = user.email;
    this.phone = user.phone;
    this.name = user.name;
  }
}
