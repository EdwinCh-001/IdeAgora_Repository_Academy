import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  Prisma,
  user_role,
  user_status,
  validation_status,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  DirectorProfileActor,
  DirectorProfileDraft,
  DirectorProfileRecord,
  DirectorProfileRepository,
  DirectorProfileValidationStatus,
  DirectorReviewProfile,
  StoredDirectorDocument,
} from '../domain/director-profile-repository.js';

const profileSelect = {
  id: true,
  summary: true,
  specializations: true,
  academic_degrees: true,
  work_experience: true,
  external_links: true,
  validation_status: true,
  rejection_reason: true,
  updated_at: true,
  director_documents: {
    select: {
      id: true,
      file_name: true,
      size_bytes: true,
      uploaded_at: true,
    },
    orderBy: { uploaded_at: 'desc' as const },
  },
} satisfies Prisma.director_profilesSelect;

const reviewProfileSelect = {
  ...profileSelect,
  users_director_profiles_user_idTousers: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      universities: { select: { name: true } },
      campuses: { select: { name: true } },
    },
  },
} satisfies Prisma.director_profilesSelect;

type ProfileRow = Prisma.director_profilesGetPayload<{
  select: typeof profileSelect;
}>;
type ReviewProfileRow = Prisma.director_profilesGetPayload<{
  select: typeof reviewProfileSelect;
}>;

interface AdministratorScope {
  universityId: string;
  campusId: string | null;
}

@Injectable()
export class PrismaDirectorProfileRepository
  implements DirectorProfileRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findForDirector(
    userId: string,
  ): Promise<DirectorProfileRecord | null> {
    const profile = await this.prisma.director_profiles.findUnique({
      where: { user_id: userId },
      select: profileSelect,
    });
    return profile ? this.mapProfile(profile) : null;
  }

  async saveForDirector(
    actor: DirectorProfileActor,
    draft: DirectorProfileDraft,
  ): Promise<DirectorProfileRecord> {
    const now = new Date();
    return this.prisma.$transaction(async (transaction) => {
      const profile = await transaction.director_profiles.upsert({
        where: { user_id: actor.id },
        create: {
          user_id: actor.id,
          summary: draft.summary,
          specializations: draft.specializations,
          academic_degrees: draft.academicDegrees,
          work_experience: draft.workExperience,
          external_links: draft.externalLinks,
          validation_status: validation_status.PENDING,
        },
        update: {
          summary: draft.summary,
          specializations: draft.specializations,
          academic_degrees: draft.academicDegrees,
          work_experience: draft.workExperience,
          external_links: draft.externalLinks,
          validation_status: validation_status.PENDING,
          validated_by: null,
          validated_at: null,
          rejection_reason: null,
          updated_at: now,
        },
        select: profileSelect,
      });
      await this.writeAudit(transaction, actor, {
        action: 'DIRECTOR_PROFILE_SAVED',
        profileId: profile.id,
        metadata: { validation_status: validation_status.PENDING },
      });
      return this.mapProfile(profile);
    });
  }

  async addDocument(
    userId: string,
    document: Omit<StoredDirectorDocument, 'id'>,
    actor: DirectorProfileActor,
  ): Promise<DirectorProfileRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const profile = await transaction.director_profiles.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      if (!profile) {
        return null;
      }

      await transaction.director_documents.create({
        data: {
          director_profile_id: profile.id,
          file_name: document.fileName,
          storage_path: document.storagePath,
          mime_type: document.mimeType,
          size_bytes: document.sizeBytes,
        },
      });
      const updatedProfile = await transaction.director_profiles.update({
        where: { id: profile.id },
        data: {
          validation_status: validation_status.PENDING,
          validated_by: null,
          validated_at: null,
          rejection_reason: null,
          updated_at: new Date(),
        },
        select: profileSelect,
      });
      await this.writeAudit(transaction, actor, {
        action: 'DIRECTOR_DOCUMENT_UPLOADED',
        profileId: profile.id,
        metadata: { file_name: document.fileName },
      });
      return this.mapProfile(updatedProfile);
    });
  }

  async findDocumentForDirector(
    userId: string,
    documentId: string,
  ): Promise<StoredDirectorDocument | null> {
    const document = await this.prisma.director_documents.findFirst({
      where: {
        id: documentId,
        director_profiles: { is: { user_id: userId } },
      },
      select: {
        id: true,
        file_name: true,
        storage_path: true,
        mime_type: true,
        size_bytes: true,
      },
    });
    return document ? this.mapStoredDocument(document) : null;
  }

  async listPendingForAdministrator(
    administratorId: string,
  ): Promise<DirectorReviewProfile[] | null> {
    const scope = await this.findAdministratorScope(
      this.prisma,
      administratorId,
    );
    if (!scope) {
      return null;
    }

    const profiles = await this.prisma.director_profiles.findMany({
      where: {
        validation_status: validation_status.PENDING,
        users_director_profiles_user_idTousers: {
          is: this.directorScopeWhere(scope),
        },
      },
      select: reviewProfileSelect,
      orderBy: { updated_at: 'asc' },
    });
    return profiles.map((profile) => this.mapReviewProfile(profile));
  }

  async findPendingForAdministrator(
    administratorId: string,
    profileId: string,
  ): Promise<DirectorReviewProfile | null> {
    const scope = await this.findAdministratorScope(
      this.prisma,
      administratorId,
    );
    if (!scope) {
      return null;
    }

    const profile = await this.prisma.director_profiles.findFirst({
      where: {
        id: profileId,
        validation_status: validation_status.PENDING,
        users_director_profiles_user_idTousers: {
          is: this.directorScopeWhere(scope),
        },
      },
      select: reviewProfileSelect,
    });
    return profile ? this.mapReviewProfile(profile) : null;
  }

  async findDocumentForAdministrator(
    administratorId: string,
    profileId: string,
    documentId: string,
  ): Promise<StoredDirectorDocument | null> {
    const scope = await this.findAdministratorScope(
      this.prisma,
      administratorId,
    );
    if (!scope) {
      return null;
    }

    const document = await this.prisma.director_documents.findFirst({
      where: {
        id: documentId,
        director_profile_id: profileId,
        director_profiles: {
          is: {
            validation_status: validation_status.PENDING,
            users_director_profiles_user_idTousers: {
              is: this.directorScopeWhere(scope),
            },
          },
        },
      },
      select: {
        id: true,
        file_name: true,
        storage_path: true,
        mime_type: true,
        size_bytes: true,
      },
    });
    return document ? this.mapStoredDocument(document) : null;
  }

  async reviewProfile(input: {
    actor: DirectorProfileActor;
    profileId: string;
    decision: 'APPROVED' | 'REJECTED';
    reason: string | null;
    now: Date;
  }): Promise<DirectorProfileValidationStatus | null> {
    return this.prisma.$transaction(async (transaction) => {
      const scope = await this.findAdministratorScope(
        transaction,
        input.actor.id,
      );
      if (!scope) {
        return null;
      }
      const reviewed = await transaction.director_profiles.updateMany({
        where: {
          id: input.profileId,
          validation_status: validation_status.PENDING,
          users_director_profiles_user_idTousers: {
            is: this.directorScopeWhere(scope),
          },
        },
        data: {
          validation_status:
            input.decision === 'APPROVED'
              ? validation_status.APPROVED
              : validation_status.REJECTED,
          validated_by: input.actor.id,
          validated_at: input.now,
          rejection_reason:
            input.decision === 'REJECTED' ? input.reason : null,
          updated_at: input.now,
        },
      });
      if (reviewed.count !== 1) {
        return null;
      }

      await this.writeAudit(transaction, input.actor, {
        action:
          input.decision === 'APPROVED'
            ? 'DIRECTOR_PROFILE_APPROVED'
            : 'DIRECTOR_PROFILE_REJECTED',
        profileId: input.profileId,
        metadata: {
          decision: input.decision,
          reason: input.reason,
        },
      });
      return input.decision;
    });
  }

  private async findAdministratorScope(
    client: PrismaService | Prisma.TransactionClient,
    administratorId: string,
  ): Promise<AdministratorScope | null> {
    const administrator = await client.users.findFirst({
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
      },
    });
    if (
      !administrator?.university_id ||
      (administrator.campus_id !== null &&
        administrator.campuses?.university_id !== administrator.university_id)
    ) {
      return null;
    }
    return {
      universityId: administrator.university_id,
      campusId: administrator.campus_id,
    };
  }

  private directorScopeWhere(
    scope: AdministratorScope,
  ): Prisma.usersWhereInput {
    return {
      role: user_role.DIRECTOR,
      status: user_status.ACTIVE,
      university_id: scope.universityId,
      ...(scope.campusId ? { campus_id: scope.campusId } : {}),
    };
  }

  private mapProfile(profile: ProfileRow): DirectorProfileRecord {
    return {
      id: profile.id,
      summary: profile.summary ?? '',
      specializations: this.parseStringArray(
        profile.specializations,
        'áreas de especialización',
      ),
      academicDegrees: this.parseStringArray(
        profile.academic_degrees,
        'títulos académicos',
      ),
      workExperience: this.parseStringArray(
        profile.work_experience,
        'experiencia laboral',
      ),
      externalLinks: this.parseStringArray(
        profile.external_links,
        'enlaces profesionales',
      ),
      validationStatus: profile.validation_status,
      rejectionReason: profile.rejection_reason,
      updatedAt: profile.updated_at,
      documents: profile.director_documents.map((document) => ({
        id: document.id,
        fileName: document.file_name,
        sizeBytes: document.size_bytes,
        uploadedAt: document.uploaded_at,
      })),
    };
  }

  private mapReviewProfile(profile: ReviewProfileRow): DirectorReviewProfile {
    const director = profile.users_director_profiles_user_idTousers;
    return {
      ...this.mapProfile(profile),
      director: {
        id: director.id,
        firstName: director.first_name,
        lastName: director.last_name,
        email: director.email,
        universityName: director.universities?.name ?? null,
        campusName: director.campuses?.name ?? null,
      },
    };
  }

  private mapStoredDocument(document: {
    id: string;
    file_name: string;
    storage_path: string;
    mime_type: string;
    size_bytes: number;
  }): StoredDirectorDocument {
    return {
      id: document.id,
      fileName: document.file_name,
      storagePath: document.storage_path,
      mimeType: document.mime_type,
      sizeBytes: document.size_bytes,
    };
  }

  private parseStringArray(value: Prisma.JsonValue, label: string): string[] {
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new InternalServerErrorException(
        `Los datos guardados para ${label} tienen un formato inválido.`,
      );
    }
    return value;
  }

  private async writeAudit(
    transaction: Prisma.TransactionClient,
    actor: DirectorProfileActor,
    event: {
      action: string;
      profileId: string;
      metadata: Prisma.InputJsonObject;
    },
  ): Promise<void> {
    await transaction.audit_logs.create({
      data: {
        actor_id: actor.id,
        actor_name: `${actor.firstName} ${actor.lastName}`.slice(0, 200),
        action: event.action,
        entity_type: 'DIRECTOR_PROFILE',
        entity_id: event.profileId,
        metadata: event.metadata,
        ip_address: actor.ipAddress ?? undefined,
      },
    });
  }
}
