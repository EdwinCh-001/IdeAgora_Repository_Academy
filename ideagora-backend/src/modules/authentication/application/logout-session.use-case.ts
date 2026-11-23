import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  AUTHENTICATION_REPOSITORY,
  type AuthenticationRepository,
} from '../domain/authentication-repository.js';

@Injectable()
export class LogoutSessionUseCase {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
  ) {}

  async execute(
    token: string | undefined,
    ipAddress: string | null,
  ): Promise<{ message: string }> {
    if (token) {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await this.authenticationRepository.revokeRefreshSession(
        tokenHash,
        new Date(),
        ipAddress,
      );
    }

    return { message: 'Sesión cerrada correctamente.' };
  }
}
