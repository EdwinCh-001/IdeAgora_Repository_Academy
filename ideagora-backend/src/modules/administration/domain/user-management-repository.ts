import type { UserRole } from '../../authentication/domain/authentication-repository.js';

export type ManagedUserStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION';

export interface UserManagementActor {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  ipAddress: string | null;
}

export interface AdministratorCredentials {
  id: string;
  role: UserRole;
  universityId: string | null;
  passwordHash: string;
}

export interface ManagedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: ManagedUserStatus;
  universityId: string | null;
  universityName: string | null;
  createdAt: Date;
  suspension: {
    reason: string;
    endsAt: Date | null;
  } | null;
}

export interface UserManagementRepository {
  findAdministrator(id: string): Promise<AdministratorCredentials | null>;
  listUsers(actorId: string, role: UserRole): Promise<ManagedUser[] | null>;
  findTarget(
    actorId: string,
    role: UserRole,
    targetId: string,
  ): Promise<ManagedUser | null>;
  suspendUser(input: {
    actor: UserManagementActor;
    targetId: string;
    reason: string;
    endsAt: Date | null;
    now: Date;
  }): Promise<ManagedUser | null>;
  reactivateUser(input: {
    actor: UserManagementActor;
    targetId: string;
    reason: string;
    now: Date;
  }): Promise<ManagedUser | null>;
}

export interface UserStatusEmailSender {
  sendStatusChangeEmail(input: {
    email: string;
    firstName: string;
    status: 'ACTIVE' | 'SUSPENDED';
    reason: string;
    endsAt: Date | null;
    actorName: string;
  }): Promise<void>;
}

export const USER_MANAGEMENT_REPOSITORY = Symbol(
  'USER_MANAGEMENT_REPOSITORY',
);
export const USER_STATUS_EMAIL_SENDER = Symbol('USER_STATUS_EMAIL_SENDER');
