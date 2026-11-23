import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AdministratorCredentials,
  ManagedUser,
  UserManagementActor,
  UserManagementRepository,
  UserStatusEmailSender,
} from '../domain/user-management-repository.js';
import type { PasswordHasher } from '../../authentication/domain/authentication-repository.js';

export async function requireAdministrator(
  repository: UserManagementRepository,
  actor: UserManagementActor,
): Promise<AdministratorCredentials> {
  const administrator = await repository.findAdministrator(actor.id);
  if (!administrator || administrator.role !== actor.role) {
    throw new ForbiddenException(
      'No tienes permisos para gestionar usuarios.',
    );
  }
  if (
    administrator.role === 'ADMIN_LOCAL' &&
    !administrator.universityId
  ) {
    throw new ForbiddenException(
      'Tu cuenta no tiene una universidad asignada.',
    );
  }
  return administrator;
}

export async function requireConfirmedTarget(
  repository: UserManagementRepository,
  actor: UserManagementActor,
  targetId: string,
  confirmationName: string,
  password: string,
  passwordHasher: PasswordHasher,
): Promise<ManagedUser> {
  if (actor.id === targetId) {
    throw new ForbiddenException('No puedes gestionar tu propia cuenta.');
  }

  const administrator = await requireAdministrator(repository, actor);
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new UnauthorizedException(
      'La contraseña de confirmación no es correcta.',
    );
  }
  const passwordMatches = await passwordHasher.compare(
    password,
    administrator.passwordHash,
  );
  if (!passwordMatches) {
    throw new UnauthorizedException(
      'La contraseña de confirmación no es correcta.',
    );
  }

  const target = await repository.findTarget(
    actor.id,
    administrator.role,
    targetId,
  );
  if (!target) {
    throw new NotFoundException('La cuenta no está dentro de tu ámbito.');
  }
  const fullName = `${target.firstName} ${target.lastName}`;
  if (confirmationName.trim() !== fullName) {
    throw new BadRequestException(
      'Escribe exactamente el nombre de la cuenta que aparece en pantalla.',
    );
  }
  return target;
}

export function requireAccountStatus(
  target: ManagedUser,
  expectedStatus: ManagedUser['status'],
  action: string,
): void {
  if (target.status !== expectedStatus) {
    throw new ConflictException(
      `Solo se puede ${action} una cuenta con estado ${expectedStatus}.`,
    );
  }
}

export async function sendStatusNotification(
  sender: UserStatusEmailSender,
  input: Parameters<UserStatusEmailSender['sendStatusChangeEmail']>[0],
  actionLabel: string,
): Promise<void> {
  try {
    await sender.sendStatusChangeEmail(input);
  } catch (error) {
    throw new ServiceUnavailableException(
      `La cuenta se ${actionLabel}, pero no se pudo entregar el correo de notificación. Verifica el servicio SMTP.`,
      { cause: error },
    );
  }
}
