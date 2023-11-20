import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExtractJwt } from 'passport-jwt';
import { ApiUnauthenticatedResponse, ApiBadRequestResponse } from '@/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiAuthGuard, ApiLocalAuthGuard } from './guards';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokenEntity } from './entities/auth-token.entity';
import { LogoutEntity } from './entities/logout.entity';

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
