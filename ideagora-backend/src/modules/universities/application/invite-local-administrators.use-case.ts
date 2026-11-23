import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  ADMIN_INVITATION_EMAIL_SENDER,
  UNIVERSITY_REPOSITORY,
  type AdminInvitationEmailSender,
  type LocalAdminInvitationDraft,
  type UniversityActor,
  type UniversityRepository,
} from '../domain/university-repository.js';
import { normalizeDomain } from './university-domain.util.js';
import {
  AUTHENTICATION_REPOSITORY,
  PASSWORD_HASHER,
  type AuthenticationRepository,
  type PasswordHasher,
} from '../../authentication/domain/authentication-repository.js';

export type InviteLocalAdministratorInput = Omit<
  LocalAdminInvitationDraft,
  'passwordHash' | 'tokenHash' | 'tokenExpiresAt'
>;

@Injectable()
export class InviteLocalAdministratorsUseCase {
  constructor(
    @Inject(UNIVERSITY_REPOSITORY)
    private readonly universityRepository: UniversityRepository,
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(ADMIN_INVITATION_EMAIL_SENDER)
    private readonly emailSender: AdminInvitationEmailSender,
  ) {}

  async execute(
    universityId: string,
    inputs: InviteLocalAdministratorInput[],
    actor: UniversityActor,
  ): Promise<{ message: string }> {
    const university = await this.universityRepository.findById(universityId);
    if (!university) {
      throw new NotFoundException('Universidad no encontrada.');
    }
    if (university.status === 'INACTIVE') {
      throw new ConflictException(
        'No se pueden asignar administradores a una universidad inactiva.',
      );
    }
    if (inputs.length === 0) {
      throw new BadRequestException('Agrega al menos un administrador local.');
    }

    const normalizedEmails = inputs.map((input) =>
      input.email.trim().toLowerCase(),
    );
    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      throw new BadRequestException(
        'Los correos de administradores no pueden repetirse.',
      );
    }

    const campusIds = new Set(
      university.campuses
        .filter((campus) => campus.status === 'ACTIVE')
        .map((campus) => campus.id),
    );
    const rootDomains = university.domains
      .filter((entry) => entry.campusId === null)
      .map((entry) => entry.domain.toLowerCase());
    const administrators: LocalAdminInvitationDraft[] = [];
    const invitationTokens: string[] = [];

    for (const [index, input] of inputs.entries()) {
      const email = normalizedEmails[index];
      const emailDomain = email.split('@').at(-1)?.toLowerCase();
      if (!emailDomain) {
        throw new BadRequestException('Ingresa un correo institucional válido.');
      }
      const requestedDomain = normalizeDomain(input.emailDomain);
      if (requestedDomain !== emailDomain) {
        throw new BadRequestException(
          'El dominio indicado debe coincidir con el correo institucional.',
        );
      }

      if (input.campusId && !campusIds.has(input.campusId)) {
        throw new BadRequestException(
          'La sede elegida no pertenece a esta universidad o está inactiva.',
        );
      }
      const allowedDomains = [
        ...rootDomains,
        ...(input.campusId
          ? university.domains
              .filter((entry) => entry.campusId === input.campusId)
              .map((entry) => entry.domain.toLowerCase())
          : []),
      ];
      const domainAlreadyRegistered = university.domains.some(
        (entry) => entry.domain.toLowerCase() === emailDomain,
      );
      if (domainAlreadyRegistered && !allowedDomains.includes(emailDomain)) {
        throw new BadRequestException(
          `El dominio del correo ${email} está asignado a otra sede.`,
        );
      }
      if (
        !/^\/public\/admin-profile-photos\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(
          input.avatarUrl,
        )
      ) {
        throw new BadRequestException(
          'Carga una foto de perfil válida para cada administrador.',
        );
      }
      if (await this.authenticationRepository.emailExists(email)) {
        throw new ConflictException(
          `El correo ${email} ya está asociado a una cuenta.`,
        );
      }

      const rawToken = randomBytes(32).toString('hex');
      invitationTokens.push(rawToken);
      administrators.push({
        ...input,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        emailDomain,
        phone: input.phone.trim(),
        jobTitle: input.jobTitle.trim(),
        avatarUrl: input.avatarUrl,
        passwordHash: await this.passwordHasher.hash(
          randomBytes(32).toString('base64url'),
        ),
        tokenHash: createHash('sha256').update(rawToken).digest('hex'),
        tokenExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });
    }

    const created = await this.universityRepository.inviteLocalAdministrators(
      universityId,
      administrators,
      actor,
    );
    for (const [index, administrator] of created.entries()) {
      await this.emailSender.sendAdminInvitationEmail({
        email: administrator.email,
        firstName: administrator.firstName,
        universityName: university.name,
        token: invitationTokens[index],
      });
    }

    return {
      message: `Se enviaron ${created.length} invitaciones de administrador local.`,
    };
  }
}
