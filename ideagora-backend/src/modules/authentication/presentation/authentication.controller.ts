import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { GetRegistrationOptionsUseCase } from '../application/get-registration-options.use-case.js';
import { LoginUserUseCase } from '../application/login-user.use-case.js';
import { LogoutSessionUseCase } from '../application/logout-session.use-case.js';
import { RefreshSessionUseCase } from '../application/refresh-session.use-case.js';
import { RegisterUserUseCase } from '../application/register-user.use-case.js';
import { ResendVerificationEmailUseCase } from '../application/resend-verification-email.use-case.js';
import { VerifyEmailUseCase } from '../application/verify-email.use-case.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { RegistrationOptionsQueryDto } from './dto/registration-options-query.dto.js';
import {
  ResendVerificationEmailDto,
  VerifyEmailDto,
} from './dto/verify-email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AcceptAdminInvitationUseCase } from '../application/accept-admin-invitation.use-case.js';
import { AcceptAdminInvitationDto } from './dto/accept-admin-invitation.dto.js';

const REFRESH_COOKIE = 'ideagora_refresh';

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logoutSession: LogoutSessionUseCase,
    private readonly getRegistrationOptions: GetRegistrationOptionsUseCase,
    private readonly registerUser: RegisterUserUseCase,
    private readonly resendVerificationEmail: ResendVerificationEmailUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly acceptAdminInvitation: AcceptAdminInvitationUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.loginUser.execute({
      email: body.email,
      password: body.password,
      userAgent: this.getUserAgent(request),
      ipAddress: request.ip ?? null,
    });
    this.setRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.refreshSession.execute(
      request.cookies?.[REFRESH_COOKIE],
      this.getUserAgent(request),
      request.ip ?? null,
    );
    this.setRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      return await this.logoutSession.execute(
        request.cookies?.[REFRESH_COOKIE],
        request.ip ?? null,
      );
    } finally {
      response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    }
  }

  @Get('registration-options')
  getOptions(@Query() query: RegistrationOptionsQueryDto) {
    return this.getRegistrationOptions.execute(query.email);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterUserDto) {
    return this.registerUser.execute(body);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verify(@Body() body: VerifyEmailDto) {
    return this.verifyEmail.execute(body.token);
  }

  @Post('accept-admin-invitation')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Body() body: AcceptAdminInvitationDto) {
    return this.acceptAdminInvitation.execute(body);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resend(@Body() body: ResendVerificationEmailDto) {
    return this.resendVerificationEmail.execute(body.email);
  }

  private setRefreshCookie(
    response: Response,
    token: string,
    expiresAt: Date,
  ): void {
    response.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      expires: expiresAt,
      maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/auth',
    };
  }

  private getUserAgent(request: Request): string | null {
    const userAgent = request.headers['user-agent'];
    return typeof userAgent === 'string' ? userAgent.slice(0, 255) : null;
  }
}
