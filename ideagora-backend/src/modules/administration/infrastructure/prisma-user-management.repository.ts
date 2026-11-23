import { Injectable } from '@nestjs/common';
import {
  Prisma,
  user_role,
  user_status,
} from '../../../../generated/prisma/client.js';
import type {
  ManagedUser,
  UserManagementActor,
  UserManagementRepository,
} from '../domain/user-management-repository.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { expireTimedUserSuspension } from '../../../common/users/expire-timed-user-suspension.js';

const managedUserSelect = {
  id: true,
  email: true,
  first_name: true,
  last_name: true,
  role: true,
  status: true,
  university_id: true,
  created_at: true,
  universities: { select: { name: true } },
  user_suspensions_user_suspensions_user_idTousers: {
    where: { lifted_at: null },
    orderBy: { starts_at: 'desc' as const },
    take: 1,
    select: { reason: true, ends_at: true },
  },
} satisfies Prisma.usersSelect;

type ManagedUserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: user_role;
  status: user_status;
  university_id: string | null;
  created_at: Date;
  universities: { name: string } | null;
  user_suspensions_user_suspensions_user_idTousers: Array<{
    reason: string;
    ends_at: Date | null;
  }>;
};

interface ManagerRecord {
  id: string;
  role: user_role;
  university_id: string | null;
}

@Injectable()
export class PrismaUserManagementRepository
  implements UserManagementRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAdministrator(id: string) {
    const administrator = await this.prisma.users.findFirst({
      where: {
        id,
        status: user_status.ACTIVE,
        role: { in: [user_role.ADMIN_GLOBAL, user_role.ADMIN_LOCAL] },
      },
      select: {
        id: true,
        role: true,
        university_id: true,
        password_hash: true,
      },
    });
    return administrator
      ? {
          id: administrator.id,
          role: administrator.role,
          universityId: administrator.university_id,
          passwordHash: administrator.password_hash,
        }
      : null;
  }

  async listUsers(
    actorId: string,
    role: UserManagementActor['role'],
  ): Promise<ManagedUser[] | null> {
    const manager = await this.findManager(actorId, role);
    if (!manager) {
      return null;
    }

    const scope = this.manageableUserWhere(manager);
    const now = new Date();
    const expiredUsers = await this.prisma.users.findMany({
      where: {
        ...scope,
        status: user_status.SUSPENDED,
        user_suspensions_user_suspensions_user_idTousers: {
          some: { lifted_at: null, ends_at: { lte: now } },
        },
      },
      select: { id: true },
    });
    for (const user of expiredUsers) {
      await expireTimedUserSuspension(this.prisma, user.id, now);
    }

    const users = await this.prisma.users.findMany({
      where: scope,
      select: managedUserSelect,
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    });
    return users.map((user) => this.mapUser(user));
  }

  async findTarget(
    actorId: string,
    role: UserManagementActor['role'],
    targetId: string,
  ): Promise<ManagedUser | null> {
    const manager = await this.findManager(actorId, role);
    if (!manager) {
      return null;
    }
    const target = await this.prisma.users.findFirst({
      where: {
        id: targetId,
        ...this.manageableUserWhere(manager),
      },
      select: managedUserSelect,
    });
    return target ? this.mapUser(target) : null;
  }

  async suspendUser(input: {
    actor: UserManagementActor;
    targetId: string;
    reason: string;
    endsAt: Date | null;
    now: Date;
  }): Promise<ManagedUser | null> {
    return this.prisma.$transaction(async (transaction) => {
      const manager = await this.findManagerInTransaction(
        transaction,
        input.actor.id,
        input.actor.role,
      );
      if (!manager) {
        return null;
      }
      const target = await transaction.users.findFirst({
        where: {
          id: input.targetId,
          status: user_status.ACTIVE,
          ...this.manageableUserWhere(manager),
        },
        select: managedUserSelect,
      });
      if (!target) {
        return null;
      }

      const changed = await transaction.users.updateMany({
        where: {
          id: input.targetId,
          status: user_status.ACTIVE,
          ...this.manageableUserWhere(manager),
        },
        data: {
          status: user_status.SUSPENDED,
          updated_at: input.now,
        },
      });
      if (changed.count !== 1) {
        return null;
      }

      const suspension = await transaction.user_suspensions.create({
        data: {
          user_id: input.targetId,
          created_by: input.actor.id,
          reason: input.reason,
          starts_at: input.now,
          ends_at: input.endsAt,
        },
        select: { id: true },
      });
      await transaction.refresh_tokens.updateMany({
        where: { user_id: input.targetId, revoked_at: null },
        data: { revoked_at: input.now },
      });
      await this.writeAudit(transaction, input.actor, {
        action: 'USER_SUSPENDED',
        entityId: input.targetId,
        metadata: {
          reason: input.reason,
          ends_at: input.endsAt?.toISOString() ?? null,
          suspension_id: suspension.id,
          role: target.role,
        },
      });
      return {
        ...this.mapUser(target),
        status: 'SUSPENDED',
        suspension: { reason: input.reason, endsAt: input.endsAt },
      };
    });
  }

  async reactivateUser(input: {
    actor: UserManagementActor;
    targetId: string;
    reason: string;
    now: Date;
  }): Promise<ManagedUser | null> {
    return this.prisma.$transaction(async (transaction) => {
      const manager = await this.findManagerInTransaction(
        transaction,
        input.actor.id,
        input.actor.role,
      );
      if (!manager) {
        return null;
      }
      const target = await transaction.users.findFirst({
        where: {
          id: input.targetId,
          status: user_status.SUSPENDED,
          ...this.manageableUserWhere(manager),
        },
        select: managedUserSelect,
      });
      if (!target) {
        return null;
      }

      const changed = await transaction.users.updateMany({
        where: {
          id: input.targetId,
          status: user_status.SUSPENDED,
          ...this.manageableUserWhere(manager),
        },
        data: {
          status: user_status.ACTIVE,
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: input.now,
        },
      });
      if (changed.count !== 1) {
        return null;
      }
      await transaction.user_suspensions.updateMany({
        where: { user_id: input.targetId, lifted_at: null },
        data: {
          lifted_at: input.now,
          lifted_by: input.actor.id,
          lift_reason: input.reason,
        },
      });
      await this.writeAudit(transaction, input.actor, {
        action: 'USER_REACTIVATED',
        entityId: input.targetId,
        metadata: {
          reason: input.reason,
          role: target.role,
        },
      });
      return {
        ...this.mapUser(target),
        status: 'ACTIVE',
        suspension: null,
      };
    });
  }

  private async findManager(
    id: string,
    role: UserManagementActor['role'],
  ): Promise<ManagerRecord | null> {
    const manager = await this.prisma.users.findFirst({
      where: { id, role, status: user_status.ACTIVE },
      select: { id: true, role: true, university_id: true },
    });
    if (
      !manager ||
      !this.isAdministrator(manager.role) ||
      (manager.role === user_role.ADMIN_LOCAL && !manager.university_id)
    ) {
      return null;
    }
    return manager;
  }

  private async findManagerInTransaction(
    transaction: Prisma.TransactionClient,
    id: string,
    role: UserManagementActor['role'],
  ): Promise<ManagerRecord | null> {
    const manager = await transaction.users.findFirst({
      where: { id, role, status: user_status.ACTIVE },
      select: { id: true, role: true, university_id: true },
    });
    if (
      !manager ||
      !this.isAdministrator(manager.role) ||
      (manager.role === user_role.ADMIN_LOCAL && !manager.university_id)
    ) {
      return null;
    }
    return manager;
  }

  private manageableUserWhere(manager: ManagerRecord): Prisma.usersWhereInput {
    if (manager.role === user_role.ADMIN_GLOBAL) {
      return {
        role: {
          in: [
            user_role.ADMIN_LOCAL,
            user_role.STUDENT,
            user_role.DIRECTOR,
          ],
        },
      };
    }
    return {
      university_id: manager.university_id ?? undefined,
      role: { in: [user_role.STUDENT, user_role.DIRECTOR] },
    };
  }

  private isAdministrator(
    role: UserManagementActor['role'],
  ): boolean {
    return role === user_role.ADMIN_GLOBAL || role === user_role.ADMIN_LOCAL;
  }

  private mapUser(user: ManagedUserRow): ManagedUser {
    const suspension =
      user.user_suspensions_user_suspensions_user_idTousers[0];
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      status: user.status,
      universityId: user.university_id,
      universityName: user.universities?.name ?? null,
      createdAt: user.created_at,
      suspension: suspension
        ? { reason: suspension.reason, endsAt: suspension.ends_at }
        : null,
    };
  }

  private async writeAudit(
    transaction: Prisma.TransactionClient,
    actor: UserManagementActor,
    event: {
      action: string;
      entityId: string;
      metadata: Prisma.InputJsonObject;
    },
  ): Promise<void> {
    await transaction.audit_logs.create({
      data: {
        actor_id: actor.id,
        actor_name: `${actor.firstName} ${actor.lastName}`.slice(0, 200),
        action: event.action,
        entity_type: 'USER',
        entity_id: event.entityId,
        metadata: event.metadata,
        ip_address: actor.ipAddress ?? undefined,
      },
    });
  }
}
