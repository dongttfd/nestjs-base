import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '@/app/api/user/user.module';
import { UserDeviceModule } from '@/app/api/user-device/user-device.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiJwtStrategy, ApiLocalStrategy } from './strategies';

@Module({
  imports: [
    UserModule,
    UserDeviceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiration'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, ApiLocalStrategy, ApiJwtStrategy],
})
export class AuthModule {}
