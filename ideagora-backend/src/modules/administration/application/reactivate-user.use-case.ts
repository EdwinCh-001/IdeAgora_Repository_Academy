import { ConflictException, Inject, Injectable } from '@nestjs/common';
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

export interface ReactivateUserInput {
  confirmationName: string;
  password: string;
  reason: string;
}

@Injectable()
export class ReactivateUserUseCase {
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
    input: ReactivateUserInput,
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
    requireAccountStatus(target, 'SUSPENDED', 'reactivar');

    const reactivated = await this.repository.reactivateUser({
      actor,
      targetId,
      reason: input.reason.trim(),
      now: new Date(),
    });
    if (!reactivated) {
      throw new ConflictException(
        'La cuenta cambió mientras se procesaba la reactivación. Actualiza la lista e inténtalo nuevamente.',
      );
    }

    await sendStatusNotification(
      this.emailSender,
      {
        email: reactivated.email,
        firstName: reactivated.firstName,
        status: 'ACTIVE',
        reason: input.reason.trim(),
        endsAt: null,
        actorName: `${actor.firstName} ${actor.lastName}`,
      },
      'reactivó',
    );
    return reactivated;
  }
}
