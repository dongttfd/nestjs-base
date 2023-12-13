import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CommonModule } from '@/common';
import { ServeStaticExceptionFilter } from '@/common/filters';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
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
