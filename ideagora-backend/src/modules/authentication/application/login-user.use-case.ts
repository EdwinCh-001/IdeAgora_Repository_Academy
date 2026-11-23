import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import {
  AUTHENTICATION_REPOSITORY,
  PASSWORD_HASHER,
  type AuthenticatedUser,
  type AuthenticationRepository,
  type PasswordHasher,
} from '../domain/authentication-repository.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_TOKEN_DAYS = 7;

export interface LoginInput {
  email: string;
  password: string;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUser;
}

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<AuthSessionResult> {
    const email = input.email.trim().toLowerCase();
    const account = await this.authenticationRepository.findLoginAccount(email);
    if (!account || account.status !== 'ACTIVE') {
      throw this.invalidCredentials();
    }

    const now = new Date();
    if (account.lockedUntil && account.lockedUntil > now) {
      throw this.invalidCredentials();
    }
    if (account.lockedUntil && account.lockedUntil <= now) {
      await this.authenticationRepository.clearExpiredLoginLock(
        account.id,
        now,
      );
    }

    const passwordMatches =
      Buffer.byteLength(input.password, 'utf8') <= 72 &&
      (await this.passwordHasher.compare(input.password, account.passwordHash));
    if (!passwordMatches) {
      await this.authenticationRepository.recordFailedLogin(
        account.id,
        MAX_FAILED_ATTEMPTS,
        new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000),
      );
      throw this.invalidCredentials();
    }

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.authenticationRepository.createAuthenticatedSession({
      userId: account.id,
      refreshTokenHash: this.hashToken(refreshToken),
      refreshTokenExpiresAt,
      loggedInAt: now,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return {
      accessToken: await this.createAccessToken(account),
      refreshToken,
      refreshTokenExpiresAt,
      user: this.toAuthenticatedUser(account),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private createAccessToken(user: AuthenticatedUser): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
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

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException('Credenciales inválidas.');
  }
}
