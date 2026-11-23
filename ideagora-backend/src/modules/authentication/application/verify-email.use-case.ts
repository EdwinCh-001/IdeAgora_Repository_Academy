import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  AUTHENTICATION_REPOSITORY,
  type AuthenticationRepository,
} from '../domain/authentication-repository.js';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
  ) {}

  async execute(token: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const verification =
      await this.authenticationRepository.findVerificationToken(tokenHash);

    if (!verification) {
      throw new UnauthorizedException(
        'El enlace de verificación no es válido.',
      );
    }

    if (verification.usedAt && verification.userStatus === 'ACTIVE') {
      return { message: 'El correo ya fue verificado. Ya puedes iniciar sesión.' };
    }

    const now = new Date();
    if (verification.expiresAt <= now || verification.usedAt) {
      throw new BadRequestException(
        'El enlace de verificación expiró. Solicita uno nuevo.',
      );
    }

    const activated =
      await this.authenticationRepository.consumeAndActivateVerificationToken(
        verification.id,
        verification.userId,
        now,
      );
    if (!activated) {
      throw new BadRequestException(
        'El enlace de verificación expiró o ya fue utilizado.',
      );
    }

    return { message: 'Correo verificado correctamente. Ya puedes iniciar sesión.' };
  }
}
