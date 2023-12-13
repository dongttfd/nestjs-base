import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExtractJwt } from 'passport-jwt';
import { ApiUnauthenticatedResponse, ApiBadRequestResponse } from '@/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { AuthTokenEntity, LogoutEntity } from './entities';
import { ApiAuthGuard, ApiLocalAuthGuard } from './guards';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login
   */
  @ApiUnauthenticatedResponse()
  @ApiBadRequestResponse()
  @UseGuards(ApiLocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req) {
    return new AuthTokenEntity(
      await this.authService.login(req.user, loginDto.deviceId),
    );
  }

  /**
   * Refresh Access token
   */
  @ApiUnauthenticatedResponse()
  @ApiBadRequestResponse()
  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return new AuthTokenEntity(
      await this.authService.refreshToken(refreshTokenDto),
    );
  }

  /**
   * Logout
   */
  @ApiAuthGuard()
  @Post('logout')
  async logout(@Request() request) {
    return new LogoutEntity(
      await this.authService.logout(
        ExtractJwt.fromAuthHeaderAsBearerToken()(request),
      ),
    );
  }
}
