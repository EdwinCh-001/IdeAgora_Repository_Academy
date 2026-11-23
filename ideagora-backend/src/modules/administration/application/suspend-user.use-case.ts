import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../authentication/domain/authentication-repository.js';
import {
  USER_MANAGEMENT_REPOSITORY,
  USER_STATUS_EMAIL_SENDER,
  type UserManagementActor,
  type UserManagementRepository,
  type UserStatusEmailSender,
} from '../domain/user-management-repository.js';
import {
  requireAccountStatus,
  requireConfirmedTarget,
  sendStatusNotification,
} from './user-management.util.js';

export interface SuspendUserInput {
  confirmationName: string;
  password: string;
  reason: string;
  permanent: boolean;
  endsAt?: string | null;
}

@Injectable()
export class SuspendUserUseCase {
  constructor(
    @Inject(USER_MANAGEMENT_REPOSITORY)
    private readonly repository: UserManagementRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(USER_STATUS_EMAIL_SENDER)
    private readonly emailSender: UserStatusEmailSender,
  ) {}

  async execute(
    targetId: string,
    input: SuspendUserInput,
    actor: UserManagementActor,
  ) {
    const target = await requireConfirmedTarget(
      this.repository,
      actor,
      targetId,
      input.confirmationName,
      input.password,
      this.passwordHasher,
    );
    requireAccountStatus(target, 'ACTIVE', 'suspender');

    const now = new Date();
    let endsAt: Date | null = null;
    if (input.permanent) {
      if (input.endsAt) {
        throw new BadRequestException(
          'Una suspensión permanente no puede tener fecha de finalización.',
        );
      }
    } else {
      if (!input.endsAt) {
        throw new BadRequestException(
          'Selecciona cuándo debe finalizar la suspensión o indícala como permanente.',
        );
      }
      endsAt = new Date(input.endsAt);
      if (!Number.isFinite(endsAt.getTime()) || endsAt <= now) {
        throw new BadRequestException(
          'La fecha de finalización debe ser futura.',
        );
      }
    }

    const suspended = await this.repository.suspendUser({
      actor,
      targetId,
      reason: input.reason.trim(),
      endsAt,
      now,
    });
    if (!suspended) {
      throw new ConflictException(
        'La cuenta cambió mientras se procesaba la suspensión. Actualiza la lista e inténtalo nuevamente.',
      );
    }

    await sendStatusNotification(
      this.emailSender,
      {
        email: suspended.email,
        firstName: suspended.firstName,
        status: 'SUSPENDED',
        reason: input.reason.trim(),
        endsAt,
        actorName: `${actor.firstName} ${actor.lastName}`,
      },
      'suspendió',
    );
    return suspended;
  }
}
