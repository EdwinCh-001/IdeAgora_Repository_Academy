import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  AUTHENTICATION_REPOSITORY,
  PASSWORD_HASHER,
  VERIFICATION_EMAIL_SENDER,
  type AuthenticationRepository,
  type PasswordHasher,
  type VerificationEmailSender,
} from '../domain/authentication-repository.js';

export interface RegisterUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  facultyId: string;
  careerId: string;
  interestIds: string[];
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(VERIFICATION_EMAIL_SENDER)
    private readonly verificationEmailSender: VerificationEmailSender,
  ) {}

  async execute(input: RegisterUserInput): Promise<{ message: string }> {
    if (!input.firstName.trim() || !input.lastName.trim()) {
      throw new BadRequestException('Ingresa tus nombres y apellidos.');
    }

    if (Buffer.byteLength(input.password, 'utf8') > 72) {
      throw new BadRequestException(
        'La contraseña no puede superar 72 bytes.',
      );
    }

    const email = input.email.trim().toLowerCase();
    const domain = email.split('@').at(-1);
    if (!domain) {
      throw new BadRequestException('Ingresa un correo institucional válido.');
    }

    if (await this.authenticationRepository.emailExists(email)) {
      throw new ConflictException('Este correo ya se encuentra registrado.');
    }

    const options =
      await this.authenticationRepository.getRegistrationOptions(domain);
    if (!options) {
      throw new BadRequestException(
        'La universidad no se encuentra disponible para el registro.',
      );
    }

    const affiliationIsValid =
      await this.authenticationRepository.facultyAndCareerBelongToUniversity(
        input.facultyId,
        input.careerId,
        options.university.id,
        options.campusId,
      );
    if (!affiliationIsValid) {
      throw new BadRequestException(
        'La facultad y carrera seleccionadas no pertenecen a la universidad.',
      );
    }

    const interestIds = [...new Set(input.interestIds)];
    const existingInterestIds =
      await this.authenticationRepository.findExistingInterestIds(interestIds);
    if (existingInterestIds.length !== interestIds.length) {
      throw new BadRequestException('Uno o más intereses no son válidos.');
    }

    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenHash = createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    const passwordHash = await this.passwordHasher.hash(input.password);

    await this.authenticationRepository.createPendingUser({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      passwordHash,
      universityId: options.university.id,
      campusId: options.campusId,
      facultyId: input.facultyId,
      careerId: input.careerId,
      interestIds,
      verificationTokenHash,
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.verificationEmailSender.sendVerificationEmail({
      email,
      firstName: input.firstName.trim(),
      token: verificationToken,
    });

    return {
      message:
        'Cuenta creada. Revisa tu correo institucional para verificarla.',
    };
  }
}
