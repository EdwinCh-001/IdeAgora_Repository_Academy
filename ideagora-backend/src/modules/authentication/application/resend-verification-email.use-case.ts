import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  AUTHENTICATION_REPOSITORY,
  VERIFICATION_EMAIL_SENDER,
  type AuthenticationRepository,
  type VerificationEmailSender,
} from '../domain/authentication-repository.js';

const genericResponse = {
  message:
    'Si existe una cuenta pendiente para ese correo, recibirás un nuevo enlace de verificación.',
};

@Injectable()
export class ResendVerificationEmailUseCase {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
    @Inject(VERIFICATION_EMAIL_SENDER)
    private readonly verificationEmailSender: VerificationEmailSender,
  ) {}

  async execute(email: string): Promise<typeof genericResponse> {
    const pendingUser =
      await this.authenticationRepository.findPendingUser(
        email.trim().toLowerCase(),
      );
    if (!pendingUser) {
      return genericResponse;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.authenticationRepository.issueVerificationToken(
      pendingUser.id,
      tokenHash,
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );
    await this.verificationEmailSender.sendVerificationEmail({
      email: email.trim().toLowerCase(),
      firstName: pendingUser.firstName,
      token,
    });

    return genericResponse;
  }
}
