import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { TokensDto } from './dto/tokens.dto.js';
import { Public, CurrentUser } from '../common/decorators/index.js';
import {
  LoginRateLimitInterceptor,
  CaptchaInterceptor,
} from './interceptors/index.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  displayName: string;
}

interface RefreshUser {
  id: string;
  email: string;
  role: string;
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: TokensDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<TokensDto> {
    const tokens = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @UseInterceptors(CaptchaInterceptor, LoginRateLimitInterceptor)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: TokensDto })
  @ApiResponse({
    status: 429,
    description: 'Too many failed login attempts — try again later',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<TokensDto> {
    const tokens = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: TokensDto })
  async refresh(
    @CurrentUser() user: RefreshUser,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<TokensDto> {
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId);
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuthenticatedUser> {
    return user;
  }

  // ─── OAuth: Google ────────────────────────────

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleLogin(): void {
    // Passport redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ): Promise<void> {
    await this.handleOAuthCallback(req, res);
  }

  // ─── OAuth: GitHub ────────────────────────────

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  githubLogin(): void {
    // Passport redirects to GitHub
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ): Promise<void> {
    await this.handleOAuthCallback(req, res);
  }

  // ─── OAuth: Yandex ────────────────────────────

  @Public()
  @Get('yandex')
  @UseGuards(AuthGuard('yandex'))
  @ApiOperation({ summary: 'Initiate Yandex OAuth login' })
  yandexLogin(): void {
    // Passport redirects to Yandex
  }

  @Public()
  @Get('yandex/callback')
  @UseGuards(AuthGuard('yandex'))
  async yandexCallback(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ): Promise<void> {
    await this.handleOAuthCallback(req, res);
  }

  // ─── Helpers ──────────────────────────────────

  private async handleOAuthCallback(
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    const user = req.user as {
      id: string;
      email: string;
      role: string;
      displayName: string;
      passwordHash: string | null;
      avatarUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    const tokens = await this.authService.generateTokens(user);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}`,
    );
  }

  private setRefreshTokenCookie(
    res: express.Response,
    token: string,
  ): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });
  }
}
