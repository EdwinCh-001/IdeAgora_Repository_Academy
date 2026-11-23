import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import {
  AUTHENTICATION_REPOSITORY,
  type AuthenticatedUser,
  type AuthenticationRepository,
} from '../domain/authentication-repository.js';
import type { AuthSessionResult } from './login-user.use-case.js';

const REFRESH_TOKEN_DAYS = 7;

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    token: string | undefined,
    userAgent: string | null,
    ipAddress: string | null,
  ): Promise<AuthSessionResult> {
    if (!token) {
      throw this.invalidSession();
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session =
      await this.authenticationRepository.findRefreshSession(tokenHash);
    const now = new Date();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.userStatus !== 'ACTIVE'
    ) {
      throw this.invalidSession();
    }

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );
    const rotated = await this.authenticationRepository.rotateRefreshSession({
      sessionId: session.id,
      now,
      refreshTokenHash: createHash('sha256')
        .update(refreshToken)
        .digest('hex'),
      refreshTokenExpiresAt,
      userAgent,
      ipAddress,
    });
    if (!rotated) {
      throw this.invalidSession();
    }

    const user = session.user;
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken,
      refreshTokenExpiresAt,
      user: this.toAuthenticatedUser(user),
    };
  }

  private toAuthenticatedUser(user: AuthenticatedUser): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException('La sesión expiró. Inicia sesión nuevamente.');
  }
}
