import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  ADMIN_INVITATION_EMAIL_SENDER,
  UNIVERSITY_REPOSITORY,
  type AdminInvitationEmailSender,
  type UniversityActor,
  type UniversityRepository,
} from '../domain/university-repository.js';

@Injectable()
export class ResendAdminInvitationUseCase {
  constructor(
    @Inject(UNIVERSITY_REPOSITORY)
    private readonly universityRepository: UniversityRepository,
    @Inject(ADMIN_INVITATION_EMAIL_SENDER)
    private readonly emailSender: AdminInvitationEmailSender,
  ) {}

  async execute(
    universityId: string,
    administratorId: string,
    actor: UniversityActor,
  ): Promise<{ message: string }> {
    const [university, administrator] = await Promise.all([
      this.universityRepository.findById(universityId),
      this.universityRepository.findPendingLocalAdministrator(
        universityId,
        administratorId,
      ),
    ]);
    if (!university || !administrator) {
      throw new NotFoundException(
        'No se encontró una invitación pendiente para ese administrador.',
      );
    }

    const token = randomBytes(32).toString('hex');
    const replaced = await this.universityRepository.replaceInvitationToken(
      administratorId,
      createHash('sha256').update(token).digest('hex'),
      new Date(Date.now() + 72 * 60 * 60 * 1000),
      actor,
    );
    if (!replaced) {
      throw new NotFoundException(
        'No se encontró una invitación pendiente para ese administrador.',
      );
    }

    await this.emailSender.sendAdminInvitationEmail({
      email: administrator.email,
      firstName: administrator.firstName,
      universityName: university.name,
      token,
    });
    return { message: 'Se envió un nuevo enlace de asignación.' };
  }
}
