import { ApiProperty } from '@nestjs/swagger';
import { SuccessEntity } from '@/common';

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
