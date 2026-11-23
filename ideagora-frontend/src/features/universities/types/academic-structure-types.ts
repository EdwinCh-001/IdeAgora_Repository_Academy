export type AcademicEntityStatus = 'ACTIVE' | 'INACTIVE'

export interface AcademicStructureCampus {
  id: string
  name: string
  status: AcademicEntityStatus
}

export interface AcademicCareerRecord {
  id: string
  code: string
  name: string
  status: AcademicEntityStatus
}

export interface AcademicFacultyRecord {
  id: string
  name: string
  acronym: string | null
  campusId: string | null
  campusName: string | null
  status: AcademicEntityStatus
  careers: AcademicCareerRecord[]
}

export interface AcademicStructureRecord {
  university: {
    id: string
    name: string
  }
  assignedCampusId: string | null
  campuses: AcademicStructureCampus[]
  faculties: AcademicFacultyRecord[]
}

export interface FacultyPayload {
  name: string
  acronym: string | null
  campusId?: string | null
}

export interface CareerPayload {
  code: string
  name: string
}
