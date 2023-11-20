import { SuccessEntity } from '@/common';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutEntity extends SuccessEntity<{ logout: boolean }> {
  @ApiProperty({
    type: Object,
    example: {
      logout: true,
    },
  })
  data: {
    logout: boolean;
  };

  constructor(logout: boolean) {
    super({ logout });
  }
}
