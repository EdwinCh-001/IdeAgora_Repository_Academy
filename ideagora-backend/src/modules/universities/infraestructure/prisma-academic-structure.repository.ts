import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  Prisma,
  entity_status,
  user_role,
  user_status,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  AcademicCareerRecord,
  AcademicEntityStatus,
  AcademicFacultyRecord,
  AcademicStructureActor,
  AcademicStructureRecord,
  AcademicStructureRepository,
  AcademicStructureScope,
  CareerDraft,
  FacultyDraft,
} from '../domain/academic-structure-repository.js';

const facultyRelations = {
  campuses: { select: { id: true, name: true } },
  careers: { orderBy: { name: 'asc' as const } },
} satisfies Prisma.facultiesInclude;

type FacultyWithRelations = {
  id: string;
  name: string;
  acronym: string | null;
  campus_id: string | null;
  status: AcademicEntityStatus;
  campuses: { id: string; name: string } | null;
  careers: Array<{
    id: string;
    code: string;
    name: string;
    status: AcademicEntityStatus;
  }>;
};

@Injectable()
export class PrismaAcademicStructureRepository
  implements AcademicStructureRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async getLocalAdminScope(
    administratorId: string,
  ): Promise<AcademicStructureScope | null> {
    const administrator = await this.prisma.users.findFirst({
      where: {
        id: administratorId,
        role: user_role.ADMIN_LOCAL,
        status: user_status.ACTIVE,
        university_id: { not: null },
      },
      select: {
        university_id: true,
        campus_id: true,
        campuses: { select: { university_id: true } },
        universities: {
          select: {
            id: true,
            name: true,
            campuses: {
              orderBy: { name: 'asc' },
              select: { id: true, name: true, status: true },
            },
          },
        },
      },
    });
    const university = administrator?.universities;
    if (
      !administrator ||
      !university ||
      (administrator.campus_id !== null &&
        administrator.campuses?.university_id !== university.id)
    ) {
      return null;
    }

    return {
      universityId: university.id,
      universityName: university.name,
      campusId: administrator.campus_id,
      campuses: university.campuses.map((campus) => ({
        id: campus.id,
        name: campus.name,
        status: campus.status,
      })),
    };
  }

  async list(
    scope: AcademicStructureScope,
  ): Promise<AcademicStructureRecord> {
    const faculties = await this.prisma.faculties.findMany({
      where: {
        university_id: scope.universityId,
        ...(scope.campusId ? { campus_id: scope.campusId } : {}),
      },
      include: facultyRelations,
      orderBy: { name: 'asc' },
    });
    return {
      university: {
        id: scope.universityId,
        name: scope.universityName,
      },
      assignedCampusId: scope.campusId,
      campuses: scope.campuses,
      faculties: faculties.map((faculty) => this.mapFaculty(faculty)),
    };
  }

  async createFaculty(
    scope: AcademicStructureScope,
    draft: FacultyDraft,
    actor: AcademicStructureActor,
  ): Promise<AcademicFacultyRecord> {
    this.assertCampusScope(scope, draft.campusId);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.assertUniqueFaculty(
          transaction,
          scope.universityId,
          draft.campusId,
          draft.name,
          draft.acronym,
        );
        const faculty = await transaction.faculties.create({
          data: {
            university_id: scope.universityId,
            campus_id: draft.campusId,
            name: draft.name,
            acronym: draft.acronym,
            status: entity_status.ACTIVE,
          },
          include: facultyRelations,
        });
        await this.writeAudit(transaction, actor, {
          action: 'FACULTY_CREATED',
          entityType: 'FACULTY',
          entityId: faculty.id,
          metadata: {
            university_id: scope.universityId,
            campus_id: draft.campusId,
            name: faculty.name,
            acronym: faculty.acronym,
          },
        });
        return this.mapFaculty(faculty);
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
    }
  }

  async updateFaculty(
    scope: AcademicStructureScope,
    facultyId: string,
    draft: Pick<FacultyDraft, 'name' | 'acronym'>,
    actor: AcademicStructureActor,
  ): Promise<AcademicFacultyRecord | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.faculties.findFirst({
          where: {
            id: facultyId,
            ...this.facultyScopeWhere(scope),
          },
          select: { id: true, campus_id: true },
        });
        if (!existing) {
          return null;
        }
        await this.assertUniqueFaculty(
          transaction,
          scope.universityId,
          existing.campus_id,
          draft.name,
          draft.acronym,
          facultyId,
        );
        const faculty = await transaction.faculties.update({
          where: { id: facultyId },
          data: {
            name: draft.name,
            acronym: draft.acronym,
            updated_at: new Date(),
          },
          include: facultyRelations,
        });
        await this.writeAudit(transaction, actor, {
          action: 'FACULTY_UPDATED',
          entityType: 'FACULTY',
          entityId: facultyId,
          metadata: {
            university_id: scope.universityId,
            name: faculty.name,
            acronym: faculty.acronym,
          },
        });
        return this.mapFaculty(faculty);
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
    }
  }

  async setFacultyStatus(
    scope: AcademicStructureScope,
    facultyId: string,
    status: AcademicEntityStatus,
    actor: AcademicStructureActor,
  ): Promise<AcademicFacultyRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.faculties.findFirst({
        where: {
          id: facultyId,
          ...this.facultyScopeWhere(scope),
        },
        select: { id: true, status: true, name: true },
      });
      if (!existing) {
        return null;
      }
      if (existing.status === status) {
        const unchanged = await transaction.faculties.findUnique({
          where: { id: facultyId },
          include: facultyRelations,
        });
        return unchanged ? this.mapFaculty(unchanged) : null;
      }
      const faculty = await transaction.faculties.update({
        where: { id: facultyId },
        data: { status, updated_at: new Date() },
        include: facultyRelations,
      });
      await this.writeAudit(transaction, actor, {
        action:
          status === entity_status.INACTIVE
            ? 'FACULTY_DEACTIVATED'
            : 'FACULTY_ACTIVATED',
        entityType: 'FACULTY',
        entityId: facultyId,
        metadata: {
          university_id: scope.universityId,
          previous_status: existing.status,
          status,
          name: existing.name,
        },
      });
      return this.mapFaculty(faculty);
    });
  }

  async createCareer(
    scope: AcademicStructureScope,
    facultyId: string,
    draft: CareerDraft,
    actor: AcademicStructureActor,
  ): Promise<AcademicCareerRecord | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const faculty = await transaction.faculties.findFirst({
          where: {
            id: facultyId,
            status: entity_status.ACTIVE,
            ...this.facultyScopeWhere(scope),
          },
          select: { id: true, name: true },
        });
        if (!faculty) {
          return null;
        }
        await this.assertUniqueCareer(
          transaction,
          facultyId,
          draft,
        );
        const career = await transaction.careers.create({
          data: {
            faculty_id: facultyId,
            code: draft.code,
            name: draft.name,
            status: entity_status.ACTIVE,
          },
        });
        await this.writeAudit(transaction, actor, {
          action: 'CAREER_CREATED',
          entityType: 'CAREER',
          entityId: career.id,
          metadata: {
            university_id: scope.universityId,
            faculty_id: facultyId,
            faculty_name: faculty.name,
            code: career.code,
            name: career.name,
          },
        });
        return this.mapCareer(career);
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
    }
  }

  async updateCareer(
    scope: AcademicStructureScope,
    careerId: string,
    draft: CareerDraft,
    actor: AcademicStructureActor,
  ): Promise<AcademicCareerRecord | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.careers.findFirst({
          where: {
            id: careerId,
            faculties: { is: this.facultyScopeWhere(scope) },
          },
          select: { id: true, faculty_id: true },
        });
        if (!existing) {
          return null;
        }
        await this.assertUniqueCareer(
          transaction,
          existing.faculty_id,
          draft,
          careerId,
        );
        const career = await transaction.careers.update({
          where: { id: careerId },
          data: {
            code: draft.code,
            name: draft.name,
            updated_at: new Date(),
          },
        });
        await this.writeAudit(transaction, actor, {
          action: 'CAREER_UPDATED',
          entityType: 'CAREER',
          entityId: careerId,
          metadata: {
            university_id: scope.universityId,
            faculty_id: existing.faculty_id,
            code: career.code,
            name: career.name,
          },
        });
        return this.mapCareer(career);
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
    }
  }

  async setCareerStatus(
    scope: AcademicStructureScope,
    careerId: string,
    status: AcademicEntityStatus,
    actor: AcademicStructureActor,
  ): Promise<AcademicCareerRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.careers.findFirst({
        where: {
          id: careerId,
          faculties: {
            is: {
              ...this.facultyScopeWhere(scope),
              ...(status === entity_status.ACTIVE
                ? { status: entity_status.ACTIVE }
                : {}),
            },
          },
        },
        select: {
          id: true,
          faculty_id: true,
          code: true,
          status: true,
          name: true,
        },
      });
      if (!existing) {
        return null;
      }
      if (existing.status === status) {
        return this.mapCareer(existing);
      }
      const career = await transaction.careers.update({
        where: { id: careerId },
        data: { status, updated_at: new Date() },
      });
      await this.writeAudit(transaction, actor, {
        action:
          status === entity_status.INACTIVE
            ? 'CAREER_DEACTIVATED'
            : 'CAREER_ACTIVATED',
        entityType: 'CAREER',
        entityId: careerId,
        metadata: {
          university_id: scope.universityId,
          faculty_id: existing.faculty_id,
          previous_status: existing.status,
          status,
          name: existing.name,
        },
      });
      return this.mapCareer(career);
    });
  }

  private facultyScopeWhere(scope: AcademicStructureScope) {
    return {
      university_id: scope.universityId,
      ...(scope.campusId ? { campus_id: scope.campusId } : {}),
    };
  }

  private assertCampusScope(
    scope: AcademicStructureScope,
    campusId: string | null,
  ): void {
    if (
      (scope.campusId &&
        (campusId !== scope.campusId ||
          !scope.campuses.some(
            (campus) =>
              campus.id === scope.campusId && campus.status === 'ACTIVE',
          ))) ||
      (!scope.campusId &&
        campusId !== null &&
        !scope.campuses.some(
          (campus) => campus.id === campusId && campus.status === 'ACTIVE',
        ))
    ) {
      throw new ForbiddenException(
        'La sede seleccionada está fuera de tu ámbito de administración.',
      );
    }
  }

  private async assertUniqueFaculty(
    transaction: Prisma.TransactionClient,
    universityId: string,
    campusId: string | null,
    name: string,
    acronym: string | null,
    excludingId?: string,
  ): Promise<void> {
    const duplicate = await transaction.faculties.findFirst({
      where: {
        university_id: universityId,
        campus_id: campusId,
        ...(excludingId ? { id: { not: excludingId } } : {}),
        OR: [
          { name },
          ...(acronym
            ? [{ acronym: { equals: acronym, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'Ya existe una facultad con ese nombre o sigla en esta sede o universidad.',
      );
    }
  }

  private async assertUniqueCareer(
    transaction: Prisma.TransactionClient,
    facultyId: string,
    draft: CareerDraft,
    excludingId?: string,
  ): Promise<void> {
    const duplicate = await transaction.careers.findFirst({
      where: {
        ...(excludingId ? { id: { not: excludingId } } : {}),
        OR: [
          { code: { equals: draft.code, mode: 'insensitive' } },
          { name: draft.name },
        ],
        faculty_id: facultyId,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'Ya existe una carrera con ese identificador o nombre en esta facultad.',
      );
    }
  }

  private mapFaculty(faculty: FacultyWithRelations): AcademicFacultyRecord {
    return {
      id: faculty.id,
      name: faculty.name,
      acronym: faculty.acronym,
      campusId: faculty.campus_id,
      campusName: faculty.campuses?.name ?? null,
      status: faculty.status,
      careers: faculty.careers.map((career) => this.mapCareer(career)),
    };
  }

  private mapCareer(career: {
    id: string;
    code: string;
    name: string;
    status: AcademicEntityStatus;
  }): AcademicCareerRecord {
    return {
      id: career.id,
      code: career.code,
      name: career.name,
      status: career.status,
    };
  }

  private async writeAudit(
    transaction: Prisma.TransactionClient,
    actor: AcademicStructureActor,
    event: {
      action: string;
      entityType: 'FACULTY' | 'CAREER';
      entityId: string;
      metadata: Prisma.InputJsonObject;
    },
  ): Promise<void> {
    await transaction.audit_logs.create({
      data: {
        actor_id: actor.id,
        actor_name: `${actor.firstName} ${actor.lastName}`.slice(0, 200),
        action: event.action,
        entity_type: event.entityType,
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
        'La facultad, carrera o identificador ya está registrado en este ámbito académico.',
      );
    }
    throw error;
  }
}
