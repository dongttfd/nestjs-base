import { SuccessEntity } from '@/common';
import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenEntity extends SuccessEntity<AuthToken> {
  @ApiProperty({
    type: Object,
    example: {
      accessToken: 'eyJhbGciOi...',
      refreshToken: 'eyJhbGciOi...',
    },
  })
  data: AuthToken;

  constructor({ accessToken, refreshToken }: AuthToken) {
    super({ accessToken, refreshToken });
  }
}
