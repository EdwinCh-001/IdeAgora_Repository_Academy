import { ConflictException, Injectable } from '@nestjs/common';
import {
  token_type,
  university_status,
  user_role,
  user_status,
} from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { expireTimedUserSuspension } from '../../../common/users/expire-timed-user-suspension.js';
import type {
  AuthenticatedUser,
  AuthenticationRepository,
  CreatePendingUser,
  LoginAccount,
  RegistrationOptions,
  RefreshSession,
  VerificationTokenRecord,
} from '../domain/authentication-repository.js';

@Injectable()
export class PrismaAuthenticationRepository
  implements AuthenticationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findLoginAccount(email: string): Promise<LoginAccount | null> {
    const user = await this.prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        password_hash: true,
        status: true,
        failed_login_attempts: true,
        locked_until: true,
      },
    });
    if (!user) {
      return null;
    }

    if (user.status === user_status.SUSPENDED) {
      const now = new Date();
      await expireTimedUserSuspension(this.prisma, user.id, now);
      const currentStatus = await this.prisma.users.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      if (currentStatus) {
        user.status = currentStatus.status;
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      passwordHash: user.password_hash,
      status: user.status,
      failedLoginAttempts: user.failed_login_attempts,
      lockedUntil: user.locked_until,
    };
  }

  async clearExpiredLoginLock(userId: string, now: Date): Promise<void> {
    await this.prisma.users.updateMany({
      where: { id: userId, locked_until: { lte: now } },
      data: { failed_login_attempts: 0, locked_until: null },
    });
  }

  async recordFailedLogin(
    userId: string,
    maxAttempts: number,
    lockedUntil: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.users.update({
        where: { id: userId },
        data: { failed_login_attempts: { increment: 1 } },
        select: { failed_login_attempts: true },
      });
      if (user.failed_login_attempts >= maxAttempts) {
        await transaction.users.update({
          where: { id: userId },
          data: { locked_until: lockedUntil },
        });
      }
    });
  }

  async createAuthenticatedSession(input: {
    userId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    loggedInAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.users.update({
        where: { id: input.userId },
        data: {
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: input.loggedInAt,
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
        },
      });
      await transaction.refresh_tokens.create({
        data: {
          user_id: user.id,
          token_hash: input.refreshTokenHash,
          expires_at: input.refreshTokenExpiresAt,
          user_agent: this.limitUserAgent(input.userAgent),
          ip_address: input.ipAddress ?? undefined,
        },
      });
      if (this.isAdministrator(user.role)) {
        await transaction.audit_logs.create({
          data: {
            actor_id: user.id,
            actor_name: this.actorName(user.first_name, user.last_name),
            action: 'AUTH_LOGIN',
            entity_type: 'AUTH_SESSION',
            entity_id: user.id,
            ip_address: input.ipAddress ?? undefined,
            metadata: {
              email: user.email,
              ...(input.userAgent
                ? { user_agent: this.limitUserAgent(input.userAgent) }
                : {}),
            },
          },
        });
      }
    });
  }

  async findRefreshSession(
    tokenHash: string,
  ): Promise<RefreshSession | null> {
    const session = await this.prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        user_id: true,
        expires_at: true,
        revoked_at: true,
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            status: true,
          },
        },
      },
    });
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.user_id,
      expiresAt: session.expires_at,
      revokedAt: session.revoked_at,
      userStatus: session.users.status,
      user: this.toAuthenticatedUser(session.users),
    };
  }

  async rotateRefreshSession(input: {
    sessionId: string;
    now: Date;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refresh_tokens.updateMany({
        where: {
          id: input.sessionId,
          revoked_at: null,
          expires_at: { gt: input.now },
        },
        data: { revoked_at: input.now },
      });
      if (revoked.count !== 1) {
        return false;
      }

      const previousSession = await transaction.refresh_tokens.findUnique({
        where: { id: input.sessionId },
        select: { user_id: true },
      });
      if (!previousSession) {
        return false;
      }
      await transaction.refresh_tokens.create({
        data: {
          user_id: previousSession.user_id,
          token_hash: input.refreshTokenHash,
          expires_at: input.refreshTokenExpiresAt,
          user_agent: this.limitUserAgent(input.userAgent),
          ip_address: input.ipAddress ?? undefined,
        },
      });
      return true;
    });
  }

  async revokeRefreshSession(
    tokenHash: string,
    loggedOutAt: Date,
    ipAddress: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const session = await transaction.refresh_tokens.findUnique({
        where: { token_hash: tokenHash },
        select: {
          id: true,
          revoked_at: true,
          users: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              role: true,
            },
          },
        },
      });
      if (!session || session.revoked_at) {
        return;
      }

      const revoked = await transaction.refresh_tokens.updateMany({
        where: { id: session.id, revoked_at: null },
        data: { revoked_at: loggedOutAt },
      });
      if (revoked.count === 1 && this.isAdministrator(session.users.role)) {
        await transaction.audit_logs.create({
          data: {
            actor_id: session.users.id,
            actor_name: this.actorName(
              session.users.first_name,
              session.users.last_name,
            ),
            action: 'AUTH_LOGOUT',
            entity_type: 'AUTH_SESSION',
            entity_id: session.id,
            ip_address: ipAddress ?? undefined,
            metadata: { email: session.users.email },
          },
        });
      }
    });
  }

  async acceptAdminInvitation(
    tokenHash: string,
    passwordHash: string,
    acceptedAt: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const invitation = await transaction.verification_tokens.findUnique({
        where: { token_hash: tokenHash },
        select: {
          id: true,
          type: true,
          expires_at: true,
          used_at: true,
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              university_id: true,
            },
          },
        },
      });
      if (
        !invitation ||
        invitation.type !== token_type.ADMIN_PASSWORD_SETUP ||
        invitation.used_at ||
        invitation.expires_at <= acceptedAt ||
        !invitation.users.university_id
      ) {
        return false;
      }

      const activated = await transaction.users.updateMany({
        where: {
          id: invitation.users.id,
          role: user_role.ADMIN_LOCAL,
          status: user_status.PENDING_VERIFICATION,
        },
        data: {
          password_hash: passwordHash,
          status: user_status.ACTIVE,
          email_verified_at: acceptedAt,
        },
      });
      if (activated.count !== 1) {
        return false;
      }

      const consumed = await transaction.verification_tokens.updateMany({
        where: {
          id: invitation.id,
          type: token_type.ADMIN_PASSWORD_SETUP,
          used_at: null,
          expires_at: { gt: acceptedAt },
        },
        data: { used_at: acceptedAt },
      });
      if (consumed.count !== 1) {
        throw new ConflictException('La invitación ya fue utilizada.');
      }

      await transaction.universities.updateMany({
        where: {
          id: invitation.users.university_id,
          status: university_status.PENDING,
        },
        data: { status: university_status.ACTIVE },
      });
      await transaction.audit_logs.create({
        data: {
          actor_id: invitation.users.id,
          actor_name: `${invitation.users.first_name} ${invitation.users.last_name}`.slice(
            0,
            200,
          ),
          action: 'LOCAL_ADMIN_ACCEPTED',
          entity_type: 'UNIVERSITY',
          entity_id: invitation.users.university_id,
          metadata: { role: user_role.ADMIN_LOCAL },
        },
      });
      return true;
    });
  }

  async getRegistrationOptions(
    domain: string,
  ): Promise<RegistrationOptions | null> {
    const universityDomain = await this.prisma.university_domains.findFirst({
      where: {
        domain,
        universities: { status: 'ACTIVE' },
      },
      include: { universities: true },
    });
    if (!universityDomain) {
      return null;
    }

    const [faculties, interests] = await Promise.all([
      this.prisma.faculties.findMany({
        where: {
          university_id: universityDomain.university_id,
          ...(universityDomain.campus_id
            ? {
                OR: [
                  { campus_id: null },
                  { campus_id: universityDomain.campus_id },
                ],
              }
            : {}),
          status: 'ACTIVE',
          careers: { some: { status: 'ACTIVE' } },
        },
        select: {
          id: true,
          name: true,
          careers: {
            where: { status: 'ACTIVE' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.interest_catalog.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      university: {
        id: universityDomain.universities.id,
        name: universityDomain.universities.name,
      },
      campusId: universityDomain.campus_id,
      faculties,
      interests,
    };
  }

  async emailExists(email: string): Promise<boolean> {
    return (
      (await this.prisma.users.findUnique({
        where: { email },
        select: { id: true },
      })) !== null
    );
  }

  async facultyAndCareerBelongToUniversity(
    facultyId: string,
    careerId: string,
    universityId: string,
    campusId: string | null,
  ): Promise<boolean> {
    return (
      (await this.prisma.faculties.findFirst({
        where: {
          id: facultyId,
          university_id: universityId,
          ...(campusId
            ? {
                OR: [{ campus_id: null }, { campus_id: campusId }],
              }
            : {}),
          status: 'ACTIVE',
          careers: {
            some: { id: careerId, status: 'ACTIVE' },
          },
        },
        select: { id: true },
      })) !== null
    );
  }

  async findExistingInterestIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    const interests = await this.prisma.interest_catalog.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return interests.map(({ id }) => id);
  }

  async createPendingUser(data: CreatePendingUser): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.users.create({
        data: {
          email: data.email,
          password_hash: data.passwordHash,
          first_name: data.firstName,
          last_name: data.lastName,
          role: 'STUDENT',
          status: user_status.PENDING_VERIFICATION,
          university_id: data.universityId,
          campus_id: data.campusId,
          faculty_id: data.facultyId,
          career_id: data.careerId,
        },
        select: { id: true },
      });

      if (data.interestIds.length > 0) {
        await transaction.user_interests.createMany({
          data: data.interestIds.map((interestId) => ({
            user_id: user.id,
            interest_id: interestId,
          })),
        });
      }

      await transaction.verification_tokens.create({
        data: {
          user_id: user.id,
          type: token_type.EMAIL_VERIFICATION,
          token_hash: data.verificationTokenHash,
          expires_at: data.verificationExpiresAt,
        },
      });
    });
  }

  async findPendingUser(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email, status: user_status.PENDING_VERIFICATION },
      select: { id: true, first_name: true },
    });
    return user ? { id: user.id, firstName: user.first_name } : null;
  }

  async issueVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.verification_tokens.updateMany({
        where: {
          user_id: userId,
          type: token_type.EMAIL_VERIFICATION,
          used_at: null,
        },
        data: { used_at: new Date() },
      });
      await transaction.verification_tokens.create({
        data: {
          user_id: userId,
          type: token_type.EMAIL_VERIFICATION,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      });
    });
  }

  async findVerificationToken(
    hash: string,
  ): Promise<VerificationTokenRecord | null> {
    const token = await this.prisma.verification_tokens.findUnique({
      where: { token_hash: hash },
      select: {
        id: true,
        user_id: true,
        expires_at: true,
        used_at: true,
        type: true,
        users: { select: { status: true } },
      },
    });
    if (!token || token.type !== token_type.EMAIL_VERIFICATION) {
      return null;
    }

    return {
      id: token.id,
      userId: token.user_id,
      expiresAt: token.expires_at,
      usedAt: token.used_at,
      userStatus: token.users.status,
    };
  }

  async consumeAndActivateVerificationToken(
    tokenId: string,
    userId: string,
    verifiedAt: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.verification_tokens.updateMany({
        where: {
          id: tokenId,
          used_at: null,
          expires_at: { gt: verifiedAt },
        },
        data: { used_at: verifiedAt },
      });
      if (consumed.count !== 1) {
        return false;
      }

      await transaction.users.update({
        where: { id: userId, status: user_status.PENDING_VERIFICATION },
        data: {
          status: user_status.ACTIVE,
          email_verified_at: verifiedAt,
        },
      });
      return true;
    });
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: AuthenticatedUser['role'];
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };
  }

  private isAdministrator(role: AuthenticatedUser['role']): boolean {
    return role === 'ADMIN_GLOBAL' || role === 'ADMIN_LOCAL';
  }

  private actorName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.slice(0, 200);
  }

  private limitUserAgent(userAgent: string | null): string | undefined {
    return userAgent?.slice(0, 255);
  }
}
