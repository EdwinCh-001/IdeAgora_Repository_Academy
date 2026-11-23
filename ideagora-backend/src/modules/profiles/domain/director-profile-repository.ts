export type DirectorProfileValidationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export type DirectorProfileReviewDecision = 'APPROVED' | 'REJECTED';

export interface DirectorProfileActor {
  id: string;
  firstName: string;
  lastName: string;
  ipAddress: string | null;
}

export interface DirectorProfileDraft {
  summary: string;
  specializations: string[];
  academicDegrees: string[];
  workExperience: string[];
  externalLinks: string[];
}

export interface DirectorProfileDocument {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export interface DirectorProfileRecord extends DirectorProfileDraft {
  id: string;
  validationStatus: DirectorProfileValidationStatus;
  rejectionReason: string | null;
  updatedAt: Date;
  documents: DirectorProfileDocument[];
}

export interface DirectorReviewProfile extends DirectorProfileRecord {
  director: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    universityName: string | null;
    campusName: string | null;
  };
}

export interface StoredDirectorDocument {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DirectorProfileRepository {
  findForDirector(userId: string): Promise<DirectorProfileRecord | null>;
  saveForDirector(
    actor: DirectorProfileActor,
    draft: DirectorProfileDraft,
  ): Promise<DirectorProfileRecord>;
  addDocument(
    userId: string,
    document: Omit<StoredDirectorDocument, 'id'>,
    actor: DirectorProfileActor,
  ): Promise<DirectorProfileRecord | null>;
  findDocumentForDirector(
    userId: string,
    documentId: string,
  ): Promise<StoredDirectorDocument | null>;
  listPendingForAdministrator(
    administratorId: string,
  ): Promise<DirectorReviewProfile[] | null>;
  findPendingForAdministrator(
    administratorId: string,
    profileId: string,
  ): Promise<DirectorReviewProfile | null>;
  findDocumentForAdministrator(
    administratorId: string,
    profileId: string,
    documentId: string,
  ): Promise<StoredDirectorDocument | null>;
  reviewProfile(input: {
    actor: DirectorProfileActor;
    profileId: string;
    decision: DirectorProfileReviewDecision;
    reason: string | null;
    now: Date;
  }): Promise<DirectorProfileValidationStatus | null>;
}

export const DIRECTOR_PROFILE_REPOSITORY = Symbol(
  'DIRECTOR_PROFILE_REPOSITORY',
);
