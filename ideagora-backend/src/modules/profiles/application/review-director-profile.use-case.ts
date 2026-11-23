import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DIRECTOR_PROFILE_REPOSITORY,
  type DirectorProfileActor,
  type DirectorProfileRepository,
  type DirectorProfileReviewDecision,
} from '../domain/director-profile-repository.js';

@Injectable()
export class ReviewDirectorProfileUseCase {
  constructor(
    @Inject(DIRECTOR_PROFILE_REPOSITORY)
    private readonly repository: DirectorProfileRepository,
  ) {}

  async execute(
    actor: DirectorProfileActor,
    profileId: string,
    decision: DirectorProfileReviewDecision,
    reason?: string,
  ) {
    const profile = await this.repository.findPendingForAdministrator(
      actor.id,
      profileId,
    );
    if (!profile) {
      throw new NotFoundException(
        'El perfil pendiente no existe o está fuera de tu ámbito.',
      );
    }

    const normalizedReason = reason?.trim() || null;
    if (decision === 'REJECTED' && (!normalizedReason || normalizedReason.length < 5)) {
      throw new BadRequestException(
        'Indica un motivo de al menos 5 caracteres para rechazar el perfil.',
      );
    }
    if (
      decision === 'APPROVED' &&
      (!profile.summary.trim() ||
        profile.specializations.length === 0 ||
        profile.academicDegrees.length === 0 ||
        profile.workExperience.length === 0)
    ) {
      throw new BadRequestException(
        'Para aprobar, el perfil debe incluir resumen, especializaciones, títulos y experiencia laboral.',
      );
    }

    const status = await this.repository.reviewProfile({
      actor,
      profileId,
      decision,
      reason: normalizedReason,
      now: new Date(),
    });
    if (!status) {
      throw new ConflictException(
        'El perfil cambió mientras se procesaba la revisión. Actualiza la lista e inténtalo nuevamente.',
      );
    }
    return { profileId, validationStatus: status, rejectionReason: normalizedReason };
  }
}
