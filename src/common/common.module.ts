import {
  ClassSerializerInterceptor,
  DynamicModule,
  Global,
  Module,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import path from 'path';
import { configApp } from '@/config';
import { BadRequestExceptionFilter } from './filters';
import { PrismaService } from './services';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configApp],
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'public'),
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: BadRequestExceptionFilter,
    },
  ],
})
export class CommonModule {
  static register(): DynamicModule {
    return {
      module: CommonModule,
      providers: [PrismaService],
      exports: [PrismaService],
    };
  }
}
