export type DirectorProfileValidationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'

export interface DirectorProfileDocument {
  id: string
  fileName: string
  sizeBytes: number
  uploadedAt: string
}

export interface DirectorProfile {
  id: string
  summary: string
  specializations: string[]
  academicDegrees: string[]
  workExperience: string[]
  externalLinks: string[]
  validationStatus: DirectorProfileValidationStatus
  rejectionReason: string | null
  updatedAt: string
  documents: DirectorProfileDocument[]
}

export interface DirectorProfileDraft {
  summary: string
  specializations: string[]
  academicDegrees: string[]
  workExperience: string[]
  externalLinks: string[]
}

export interface DirectorReviewProfile extends DirectorProfile {
  director: {
    id: string
    firstName: string
    lastName: string
    email: string
    universityName: string | null
    campusName: string | null
  }
}

export type DirectorProfileReviewDecision = 'APPROVED' | 'REJECTED'
