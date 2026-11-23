import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  AUTHENTICATION_REPOSITORY,
  PASSWORD_HASHER,
  type AuthenticationRepository,
  type PasswordHasher,
} from '../domain/authentication-repository.js';

@Injectable()
export class AcceptAdminInvitationUseCase {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: {
    token: string;
    password: string;
  }): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const passwordHash = await this.passwordHasher.hash(input.password);
    const accepted = await this.authenticationRepository.acceptAdminInvitation(
      tokenHash,
      passwordHash,
      new Date(),
    );
    if (!accepted) {
      throw new BadRequestException(
        'La invitación no es válida, expiró o ya fue utilizada.',
      );
    }

    return {
      message: 'Cargo aceptado y contraseña asignada. Ya puedes iniciar sesión.',
    };
  }
}
