import { Controller, Get, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiAuthGuard } from '@/app/api/auth/guards';
import { UserEntity } from './entities/user.entity';

@ApiTags('User & Profile')
@Controller()
export class UserController {

  /**
   * Get my profile
   */
  @ApiAuthGuard()
  @Get('my/profile')
  async update(@Request() request,) {
    return new UserEntity(
      request.user
    );
  }
}
