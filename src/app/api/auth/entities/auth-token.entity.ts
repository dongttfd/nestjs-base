import { ApiProperty } from '@nestjs/swagger';
import { SuccessEntity } from '@/common';

export class AuthTokenEntity extends SuccessEntity<AuthToken> {
  @ApiProperty({
    type: Object,
    example: {
      accessToken: 'eyJhbGciOi...',
    },
  })
  data: AuthToken;

  constructor({ accessToken }: AuthToken) {
    super({ accessToken });
  }
}
