import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UnauthenticatedException } from '@/common';
import { UserService } from '@/app/api/user/user.service';
import { UserDeviceService } from '@/app/api/user-device/user-device.service';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private userService: UserService,
    private userDeviceService: UserDeviceService,
  ) {}

  async validateUser(loginId: string, password: string) {
    const user = await this.userService.findFirst({
      OR: [{ email: loginId }, { phone: loginId }],
    });

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

    return this.userDeviceService.delete(user.id, jwtDecoded?.deviceId);
  }

  async refreshToken(sessionId: string, deviceId: string) {
    const userDevice = await this.userDeviceService.findBySessionId(sessionId);

    if (!userDevice || userDevice.deviceId !== deviceId) {
      throw new UnauthenticatedException();
    }

    return this.generateTokens(userDevice.userId, deviceId);
  }

  private decodeJwt(jwt: string, secret?: string) {
    let jwtDecoded: JwtPayload = null;

    try {
      jwtDecoded = this.jwtService.verify<JwtPayload>(
        jwt,
        secret ? { secret } : undefined,
      );
    } catch (e: JwtException<unknown>) {
      throw new UnauthenticatedException(e.message);
    }

    return jwtDecoded;
  }

  private async generateTokens(userId: string, deviceId: string) {
    const jwtPayload: JwtPayload = { id: userId, deviceId };
    const accessToken = this.jwtService.sign(jwtPayload);
    const sessionId = uuidv4();

    await this.userDeviceService.createOrUpdate(
      userId, deviceId, accessToken, sessionId,
    );

    return { accessToken, sessionId };
  }
}
