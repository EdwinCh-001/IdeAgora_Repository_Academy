export interface UniversityActor {
  id: string;
  firstName: string;
  lastName: string;
  ipAddress: string | null;
}

export interface CampusDraft {
  id?: string;
  name: string;
  legalName: string | null;
  province: string;
  city: string;
  reference: string | null;
}

export interface UniversityDomainDraft {
  domain: string;
  campusIndex?: number;
}

export interface UniversityDraft {
  accreditationCode: string;
  name: string;
  acronym: string | null;
  province: string;
  city: string;
  website: string | null;
  campuses: CampusDraft[];
  domains: UniversityDomainDraft[];
}

export interface LocalAdminInvitationDraft {
  firstName: string;
  lastName: string;
  email: string;
  emailDomain: string;
  phone: string;
  jobTitle: string;
  campusId: string | null;
  avatarUrl: string;
  passwordHash: string;
  tokenHash: string;
  tokenExpiresAt: Date;
}

export interface UniversityRecord {
  id: string;
  accreditationCode: string;
  name: string;
  acronym: string | null;
  province: string;
  city: string;
  website: string | null;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
  campuses: Array<{
    id: string;
    name: string;
    legalName: string | null;
    province: string;
    city: string;
    reference: string | null;
    status: 'ACTIVE' | 'INACTIVE';
  }>;
  domains: Array<{
    id: string;
    domain: string;
    campusId: string | null;
  }>;
  administrators: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    avatarUrl: string | null;
    campusId: string | null;
    status: string;
  }>;
}

export interface UniversityRepository {
  list(): Promise<UniversityRecord[]>;
  findById(id: string): Promise<UniversityRecord | null>;
  create(
    university: UniversityDraft,
    actor: UniversityActor,
  ): Promise<UniversityRecord>;
  update(
    id: string,
    university: UniversityDraft,
    actor: UniversityActor,
  ): Promise<UniversityRecord | null>;
  deactivate(
    id: string,
    actor: UniversityActor,
  ): Promise<UniversityRecord | null>;
  reactivate(
    id: string,
    actor: UniversityActor,
  ): Promise<UniversityRecord | null>;
  emailExists(email: string): Promise<boolean>;
  inviteLocalAdministrators(
    universityId: string,
    administrators: LocalAdminInvitationDraft[],
    actor: UniversityActor,
  ): Promise<Array<{ id: string; email: string; firstName: string }>>;
  findPendingLocalAdministrator(
    universityId: string,
    administratorId: string,
  ): Promise<{ id: string; email: string; firstName: string } | null>;
  replaceInvitationToken(
    administratorId: string,
    tokenHash: string,
    tokenExpiresAt: Date,
    actor: UniversityActor,
  ): Promise<boolean>;
}

export const UNIVERSITY_REPOSITORY = Symbol('UNIVERSITY_REPOSITORY');
export const ADMIN_INVITATION_EMAIL_SENDER = Symbol(
  'ADMIN_INVITATION_EMAIL_SENDER',
);

export interface AdminInvitationEmailSender {
  sendAdminInvitationEmail(input: {
    email: string;
    firstName: string;
    universityName: string;
    token: string;
  }): Promise<void>;
}
