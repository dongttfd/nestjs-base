import { IsNotEmpty, IsString } from 'class-validator';
import { IsEmailOrPhone } from '@/common';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  @IsEmailOrPhone()
  loginId: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
