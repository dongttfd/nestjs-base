import { Body, Controller, Post, Req, Res, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response, Request as ExpressRequest } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { ApiUnauthenticatedResponse, ApiBadRequestResponse, UnauthenticatedException } from '@/common';
import { clearAuthCookie, setAuthCookie } from '@/common/utils/auth';
import { SESSION_COOKIE_NAME } from '@/config/auth';
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
  async login(@Body() loginDto: LoginDto, @Request() req, @Res({ passthrough: true }) res: Response) {
    const { accessToken, sessionId } = await this.authService.login(req.user, loginDto.deviceId);
    setAuthCookie(res, sessionId);

    return new AuthTokenEntity({ accessToken });
  }

  /**
   * Refresh Access token
   */
  @ApiUnauthenticatedResponse()
  @ApiBadRequestResponse()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) throw new UnauthenticatedException();

    const { accessToken, sessionId: newSessionId } = await this.authService.refreshToken(sessionId, body.deviceId);
    setAuthCookie(res, newSessionId);

    return new AuthTokenEntity({ accessToken });
  }

  /**
   * Logout
   */
  @ApiAuthGuard()
  @Post('logout')
  async logout(@Request() request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(
      ExtractJwt.fromAuthHeaderAsBearerToken()(request),
    );
    clearAuthCookie(res);

    return new LogoutEntity(result);
  }
}
