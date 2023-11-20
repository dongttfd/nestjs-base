import { Module } from '@nestjs/common';
import { CommonModule } from '@/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { APP_FILTER } from '@nestjs/core';
import { ServeStaticExceptionFilter } from '@/common/filters';
import { UserDeviceModule } from './user-device/user-device.module';

@Module({
  imports: [CommonModule.register(), UserModule, AuthModule, UserDeviceModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ServeStaticExceptionFilter,
    },
  ],
})
export class ApiModule {}
