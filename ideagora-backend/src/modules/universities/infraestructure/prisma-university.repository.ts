import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  token_type,
  university_status,
  user_role,
  user_status,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  LocalAdminInvitationDraft,
  UniversityActor,
  UniversityDraft,
  UniversityRecord,
  UniversityRepository,
} from '../domain/university-repository.js';

const universityRelations = {
  campuses: { orderBy: { name: 'asc' as const } },
  university_domains: { orderBy: { domain: 'asc' as const } },
  users: {
    where: { role: user_role.ADMIN_LOCAL },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      job_title: true,
      avatar_url: true,
      campus_id: true,
      status: true,
    },
    orderBy: { first_name: 'asc' as const },
  },
};

@Injectable()
export class PrismaUniversityRepository implements UniversityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<UniversityRecord[]> {
    const universities = await this.prisma.universities.findMany({
      include: universityRelations,
      orderBy: { created_at: 'desc' },
    });
    return universities.map((university) => this.mapUniversity(university));
  }

  async findById(id: string): Promise<UniversityRecord | null> {
    const university = await this.prisma.universities.findUnique({
      where: { id },
      include: universityRelations,
    });
    return university ? this.mapUniversity(university) : null;
  }

  async create(
    draft: UniversityDraft,
    actor: UniversityActor,
  ): Promise<UniversityRecord> {
    try {
      const id = await this.prisma.$transaction(async (transaction) => {
        const university = await transaction.universities.create({
          data: {
            accreditation_code: draft.accreditationCode,
            name: draft.name,
            acronym: draft.acronym,
            province: draft.province,
            city: draft.city,
            website: draft.website,
            status: university_status.PENDING,
          },
          select: { id: true },
        });
        const campusIds: string[] = [];
        for (const campus of draft.campuses) {
          const createdCampus = await transaction.campuses.create({
            data: {
              university_id: university.id,
              name: campus.name,
              legal_name: campus.legalName,
              province: campus.province,
              city: campus.city,
              reference: campus.reference,
            },
            select: { id: true },
          });
          campusIds.push(createdCampus.id);
        }
        await transaction.university_domains.createMany({
          data: draft.domains.map((entry) => ({
            university_id: university.id,
            campus_id:
              entry.campusIndex === undefined
                ? null
                : campusIds[entry.campusIndex],
            domain: entry.domain,
          })),
        });
        await this.writeAudit(transaction, actor, {
          action: 'UNIVERSITY_CREATED',
          entityId: university.id,
          metadata: {
            name: draft.name,
            accreditation_code: draft.accreditationCode,
            status: university_status.PENDING,
          },
        });
        return university.id;
      });

      const created = await this.findById(id);
      if (!created) {
        throw new NotFoundException('La universidad creada no se encontró.');
      }
      return created;
    } catch (error) {
      this.throwForUniqueConstraint(error);
    }
  }

  async update(
    id: string,
    draft: UniversityDraft,
    actor: UniversityActor,
  ): Promise<UniversityRecord | null> {
    try {
      const updatedId = await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.universities.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) {
          return null;
        }

        await transaction.universities.update({
          where: { id },
          data: {
            accreditation_code: draft.accreditationCode,
            name: draft.name,
            acronym: draft.acronym,
            province: draft.province,
            city: draft.city,
            website: draft.website,
          },
        });

        const existingCampuses = await transaction.campuses.findMany({
          where: { university_id: id },
          select: { id: true },
        });
        const existingCampusIds = new Set(
          existingCampuses.map(({ id: campusId }) => campusId),
        );
        const retainedCampusIds = new Set<string>();
        const campusIds: string[] = [];

        for (const campus of draft.campuses) {
          if (campus.id) {
            if (!existingCampusIds.has(campus.id)) {
              throw new NotFoundException(
                'Una de las sedes no pertenece a esta universidad.',
              );
            }
            await transaction.campuses.update({
              where: { id: campus.id },
              data: {
                name: campus.name,
                legal_name: campus.legalName,
                province: campus.province,
                city: campus.city,
                reference: campus.reference,
              },
            });
            retainedCampusIds.add(campus.id);
            campusIds.push(campus.id);
          } else {
            const createdCampus = await transaction.campuses.create({
              data: {
                university_id: id,
                name: campus.name,
                legal_name: campus.legalName,
                province: campus.province,
                city: campus.city,
                reference: campus.reference,
              },
              select: { id: true },
            });
            retainedCampusIds.add(createdCampus.id);
            campusIds.push(createdCampus.id);
          }
        }

        const campusesToDeactivate = [...existingCampusIds].filter(
          (campusId) => !retainedCampusIds.has(campusId),
        );
        if (campusesToDeactivate.length > 0) {
          await transaction.campuses.updateMany({
            where: { id: { in: campusesToDeactivate } },
            data: { status: 'INACTIVE' },
          });
        }

        await transaction.university_domains.deleteMany({
          where: { university_id: id },
        });
        await transaction.university_domains.createMany({
          data: draft.domains.map((entry) => ({
            university_id: id,
            campus_id:
              entry.campusIndex === undefined
                ? null
                : campusIds[entry.campusIndex],
            domain: entry.domain,
          })),
        });
        await this.writeAudit(transaction, actor, {
          action: 'UNIVERSITY_UPDATED',
          entityId: id,
          metadata: {
            name: draft.name,
            accreditation_code: draft.accreditationCode,
          },
        });
        return id;
      });

      return updatedId ? this.findById(updatedId) : null;
    } catch (error) {
      this.throwForUniqueConstraint(error);
    }
  }

  async deactivate(
    id: string,
    actor: UniversityActor,
  ): Promise<UniversityRecord | null> {
    try {
      const updatedId = await this.prisma.$transaction(async (transaction) => {
        const university = await transaction.universities.update({
          where: { id },
          data: { status: university_status.INACTIVE },
          select: { id: true, name: true },
        });
        await this.writeAudit(transaction, actor, {
          action: 'UNIVERSITY_DEACTIVATED',
          entityId: id,
          metadata: { name: university.name },
        });
        return university.id;
      });
      return this.findById(updatedId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }
      throw error;
    }
  }

  async reactivate(
    id: string,
    actor: UniversityActor,
  ): Promise<UniversityRecord | null> {
    const universityId = await this.prisma.$transaction(
      async (transaction) => {
        const university = await transaction.universities.findUnique({
          where: { id },
          select: { id: true, name: true, status: true },
        });
        if (!university) {
          return null;
        }
        if (university.status !== university_status.INACTIVE) {
          return university.id;
        }

        const activeAdministratorCount = await transaction.users.count({
          where: {
            university_id: id,
            role: user_role.ADMIN_LOCAL,
            status: user_status.ACTIVE,
          },
        });
        const nextStatus =
          activeAdministratorCount > 0
            ? university_status.ACTIVE
            : university_status.PENDING;
        const updated = await transaction.universities.updateMany({
          where: { id, status: university_status.INACTIVE },
          data: { status: nextStatus },
        });
        if (updated.count === 1) {
          await this.writeAudit(transaction, actor, {
            action: 'UNIVERSITY_REACTIVATED',
            entityId: id,
            metadata: {
              name: university.name,
              previous_status: university_status.INACTIVE,
              status: nextStatus,
              active_local_administrators: activeAdministratorCount,
            },
          });
        }
        return university.id;
      },
    );
    return universityId ? this.findById(universityId) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    return (
      (await this.prisma.users.findUnique({
        where: { email },
        select: { id: true },
      })) !== null
    );
  }

  async inviteLocalAdministrators(
    universityId: string,
    administrators: LocalAdminInvitationDraft[],
    actor: UniversityActor,
  ): Promise<Array<{ id: string; email: string; firstName: string }>> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const university = await transaction.universities.findUnique({
          where: { id: universityId },
          select: { id: true },
        });
        if (!university) {
          throw new NotFoundException('Universidad no encontrada.');
        }

        const createdAdministrators: Array<{
          id: string;
          email: string;
          firstName: string;
        }> = [];
        for (const administrator of administrators) {
          const existingDomain = await transaction.university_domains.findUnique({
            where: { domain: administrator.emailDomain },
            select: { university_id: true, campus_id: true },
          });
          if (
            existingDomain &&
            (existingDomain.university_id !== universityId ||
              (existingDomain.campus_id !== null &&
                existingDomain.campus_id !== administrator.campusId))
          ) {
            throw new ConflictException(
              'El dominio indicado ya está registrado para otra institución o sede.',
            );
          }
          if (!existingDomain) {
            await transaction.university_domains.create({
              data: {
                university_id: universityId,
                campus_id: administrator.campusId,
                domain: administrator.emailDomain,
              },
            });
          }
          const user = await transaction.users.create({
            data: {
              email: administrator.email,
              password_hash: administrator.passwordHash,
              first_name: administrator.firstName,
              last_name: administrator.lastName,
              role: user_role.ADMIN_LOCAL,
              status: user_status.PENDING_VERIFICATION,
              university_id: universityId,
              campus_id: administrator.campusId,
              phone: administrator.phone,
              job_title: administrator.jobTitle,
              avatar_url: administrator.avatarUrl,
            },
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          });
          await transaction.verification_tokens.create({
            data: {
              user_id: user.id,
              type: token_type.ADMIN_PASSWORD_SETUP,
              token_hash: administrator.tokenHash,
              expires_at: administrator.tokenExpiresAt,
            },
          });
          await this.writeAudit(transaction, actor, {
            action: 'LOCAL_ADMIN_INVITED',
            entityId: user.id,
            metadata: {
              university_id: universityId,
              email: user.email,
            },
          });
          createdAdministrators.push({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
          });
        }
        return createdAdministrators;
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
    }
  }

  async findPendingLocalAdministrator(
    universityId: string,
    administratorId: string,
  ): Promise<{ id: string; email: string; firstName: string } | null> {
    const user = await this.prisma.users.findFirst({
      where: {
        id: administratorId,
        university_id: universityId,
        role: user_role.ADMIN_LOCAL,
        status: user_status.PENDING_VERIFICATION,
      },
      select: { id: true, email: true, first_name: true },
    });
    return user
      ? { id: user.id, email: user.email, firstName: user.first_name }
      : null;
  }

  async replaceInvitationToken(
    administratorId: string,
    tokenHash: string,
    tokenExpiresAt: Date,
    actor: UniversityActor,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.users.findFirst({
        where: {
          id: administratorId,
          role: user_role.ADMIN_LOCAL,
          status: user_status.PENDING_VERIFICATION,
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          university_id: true,
        },
      });
      if (!user || !user.university_id) {
        return false;
      }

      await transaction.verification_tokens.updateMany({
        where: {
          user_id: administratorId,
          type: token_type.ADMIN_PASSWORD_SETUP,
          used_at: null,
        },
        data: { used_at: new Date() },
      });
      await transaction.verification_tokens.create({
        data: {
          user_id: administratorId,
          type: token_type.ADMIN_PASSWORD_SETUP,
          token_hash: tokenHash,
          expires_at: tokenExpiresAt,
        },
      });
      await this.writeAudit(transaction, actor, {
        action: 'LOCAL_ADMIN_INVITATION_RESENT',
        entityId: administratorId,
        metadata: { email: user.email },
      });
      return true;
    });
  }

  private mapUniversity(university: {
    id: string;
    accreditation_code: string;
    name: string;
    acronym: string | null;
    province: string;
    city: string;
    website: string | null;
    status: UniversityRecord['status'];
    created_at: Date;
    updated_at: Date;
    campuses: Array<{
      id: string;
      name: string;
      legal_name: string | null;
      province: string;
      city: string;
      reference: string | null;
      status: 'ACTIVE' | 'INACTIVE';
    }>;
    university_domains: Array<{
      id: string;
      domain: string;
      campus_id: string | null;
    }>;
    users: Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      job_title: string | null;
      avatar_url: string | null;
      campus_id: string | null;
      status: string;
    }>;
  }): UniversityRecord {
    return {
      id: university.id,
      accreditationCode: university.accreditation_code,
      name: university.name,
      acronym: university.acronym,
      province: university.province,
      city: university.city,
      website: university.website,
      status: university.status,
      createdAt: university.created_at,
      updatedAt: university.updated_at,
      campuses: university.campuses.map((campus) => ({
        id: campus.id,
        name: campus.name,
        legalName: campus.legal_name,
        province: campus.province,
        city: campus.city,
        reference: campus.reference,
        status: campus.status,
      })),
      domains: university.university_domains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        campusId: domain.campus_id,
      })),
      administrators: university.users.map((user) => ({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        jobTitle: user.job_title,
        avatarUrl: user.avatar_url,
        campusId: user.campus_id,
        status: user.status,
      })),
    };
  }

  private async writeAudit(
    transaction: Prisma.TransactionClient,
    actor: UniversityActor,
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
        entity_type: 'UNIVERSITY',
        entity_id: event.entityId,
        metadata: event.metadata,
        ip_address: actor.ipAddress ?? undefined,
      },
    });
  }

  private throwForUniqueConstraint(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'El código, nombre, dominio o correo ya está registrado.',
      );
    }
    throw error;
  }
}
