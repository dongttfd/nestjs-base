import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { API_LOCAL_GUARD_NAME } from '@/config';
import { AuthService } from '@/app/api/auth/auth.service';

@Injectable()
export class ApiLocalStrategy extends PassportStrategy(
  Strategy,
  API_LOCAL_GUARD_NAME,
) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'loginId',
    });
  }

  async validate(loginId: string, password: string) {
    const user = await this.authService.validateUser(
      loginId.toLowerCase(),
      password,
    );

    return user;
  }
}
