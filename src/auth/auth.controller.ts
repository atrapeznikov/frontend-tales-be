import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  Get,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
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
import { AccessTokenDto } from './dto/tokens.dto.js';
import { SetupNicknameDto } from './dto/setup-nickname.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { Public, CurrentUser } from '../common/decorators/index.js';
import {
  LoginRateLimitInterceptor,
  CaptchaInterceptor,
  LoginCaptchaInterceptor,
} from './interceptors/index.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: Date;
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
  @UseInterceptors(CaptchaInterceptor)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: AccessTokenDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AccessTokenDto> {
    const lang =
      dto.lang ||
      (req.headers['accept-language']?.startsWith('ru') ? 'ru' : 'en');
    const tokens = await this.authService.register(dto, lang);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @UseInterceptors(LoginCaptchaInterceptor, LoginRateLimitInterceptor)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AccessTokenDto })
  @ApiResponse({
    status: 429,
    description: 'Too many failed login attempts — try again later',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AccessTokenDto> {
    const tokens = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: AccessTokenDto })
  async refresh(
    @CurrentUser() user: RefreshUser,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AccessTokenDto> {
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @UseInterceptors(CaptchaInterceptor)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiResponse({
    status: 200,
    description:
      'Always returns success — if the email is registered, a reset link is sent.',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: express.Request,
  ): Promise<{ message: string }> {
    const lang =
      dto.lang ||
      (req.headers['accept-language']?.startsWith('ru') ? 'ru' : 'en');
    await this.authService.forgotPassword(dto.email, lang);
    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a reset token' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired reset token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password has been reset successfully.' };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a user email via the link sent on signup' })
  @ApiResponse({
    status: 200,
    description: 'Email verified (or was already verified)',
  })
  @ApiResponse({
    status: 400,
    description: 'Verification link is invalid or has expired',
  })
  async verifyEmail(
    @Query() query: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const { alreadyVerified } = await this.authService.verifyEmail(query.token);
    return {
      message: alreadyVerified
        ? 'Email is already verified.'
        : 'Email verified successfully.',
    };
  }

  @Public()
  @UseInterceptors(CaptchaInterceptor)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the email-verification link' })
  @ApiResponse({
    status: 200,
    description:
      'Always returns success — if the email needs verifying, a new link is sent.',
  })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: express.Request,
  ): Promise<{ message: string }> {
    const lang =
      dto.lang ||
      (req.headers['accept-language']?.startsWith('ru') ? 'ru' : 'en');
    await this.authService.resendVerificationEmail(dto.email, lang);
    return {
      message:
        'If your account needs verification, a new verification link has been sent.',
    };
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
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Post('setup-nickname')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup nickname for OAuth registration' })
  @ApiResponse({ status: 200, type: AccessTokenDto })
  async setupNickname(
    @CurrentUser('id') userId: string,
    @Body() dto: SetupNicknameDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AccessTokenDto> {
    const tokens = await this.authService.setupNickname(userId, dto.nickname);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange an OAuth authorization code for tokens' })
  @ApiResponse({ status: 200, type: AccessTokenDto })
  async exchangeOAuthCode(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<AccessTokenDto> {
    const tokens = await this.authService.exchangeOAuthCode(code);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
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
      nickname: string | null;
      passwordHash: string | null;
      avatarUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    };

    // Generate a single-use authorization code instead of passing tokens in the URL
    const code = await this.authService.createOAuthCode(user.id);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
  }

  private setRefreshTokenCookie(res: express.Response, token: string): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });
  }
}
