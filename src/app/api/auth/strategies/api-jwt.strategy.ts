import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UnauthenticatedException } from '@/common';
import { API_JWT_GUARD_NAME } from '@/config';
import { UserService } from '@/app/api/user/user.service';
import { UserDeviceService } from '@/app/api/user-device/user-device.service';

const jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();

@Injectable()
export class ApiJwtStrategy extends PassportStrategy(
  Strategy,
  API_JWT_GUARD_NAME,
) {
  constructor(
    configService: ConfigService,
    private userService: UserService,
    private userDeviceService: UserDeviceService,
  ) {
    super({
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, { id, deviceId }: JwtPayload) {
    const token = jwtFromRequest(request);
    const user = await this.userService.findById(id);
    const userDevice = await this.userDeviceService.find({
      userId: id,
      deviceId: deviceId,
    });

    if (!user || !userDevice || userDevice.accessToken !== token) {
      throw new UnauthenticatedException();
    }

    return user;
  }
}
