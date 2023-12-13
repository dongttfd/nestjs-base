import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UnauthenticatedException } from '@/common';
import { UserService } from '@/app/api/user/user.service';
import { UserDeviceService } from '@/app/api/user-device/user-device.service';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private userService: UserService,
    private userDeviceService: UserDeviceService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findFirst({ email });

    return user && bcrypt.compareSync(password, user.password) ? user : null;
  }

  async login(user: User, deviceId: string) {
    return this.generateTokens(user.id, deviceId);
  }

  async logout(accessToken: string) {
    const jwtDecoded = this.decodeJwt(accessToken);
    const user = await this.userService.findById(jwtDecoded?.id);

    if (!user) {
      throw new UnauthenticatedException();
    }

    return !!this.userDeviceService.delete(user.id, jwtDecoded?.deviceId);
  }

  async refreshToken({ refreshToken, deviceId }: RefreshTokenDto) {
    const jwtDecoded = this.decodeJwt(
      refreshToken,
      this.configService.get<string>('jwtAdminRefreshSecret'),
    );

    const user = await this.userService.findById(jwtDecoded?.id);
    const userDevice = await this.userDeviceService.find({
      userId: jwtDecoded?.id,
      deviceId,
    });

    if (!user || !userDevice || userDevice.refreshToken !== refreshToken) {
      throw new UnauthenticatedException();
    }

    return this.generateTokens(user.id, deviceId);
  }

  private decodeJwt(jwt: string, secret?: string) {
    let jwtDecoded: JwtPayload = null;

    try {
      jwtDecoded = this.jwtService.verify<JwtPayload>(
        jwt,
        secret ? { secret } : undefined,
      );
    } catch (e: JwtException<unknown>) {
      throw new UnauthenticatedException();
    }

    return jwtDecoded;
  }

  private async generateTokens(userId: string, deviceId: string) {
    const jwtPayload: JwtPayload = {
      id: userId,
      deviceId,
    };

    const tokens: AuthToken = {
      accessToken: this.jwtService.sign(jwtPayload),
      refreshToken: this.jwtService.sign(jwtPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiration'),
      }),
    };

    return await this.userDeviceService.createOrUpdate(
      userId,
      deviceId,
      tokens,
    );
  }
}
