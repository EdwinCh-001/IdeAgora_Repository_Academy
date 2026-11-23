export type AcademicEntityStatus = 'ACTIVE' | 'INACTIVE';

export interface AcademicStructureActor {
  id: string;
  firstName: string;
  lastName: string;
  ipAddress: string | null;
}

export interface AcademicStructureCampus {
  id: string;
  name: string;
  status: AcademicEntityStatus;
}

export interface AcademicStructureScope {
  universityId: string;
  universityName: string;
  campusId: string | null;
  campuses: AcademicStructureCampus[];
}

export interface FacultyDraft {
  name: string;
  acronym: string | null;
  campusId: string | null;
}

export interface CareerDraft {
  code: string;
  name: string;
}

export interface AcademicCareerRecord {
  id: string;
  code: string;
  name: string;
  status: AcademicEntityStatus;
}

export interface AcademicFacultyRecord {
  id: string;
  name: string;
  acronym: string | null;
  campusId: string | null;
  campusName: string | null;
  status: AcademicEntityStatus;
  careers: AcademicCareerRecord[];
}

export interface AcademicStructureRecord {
  university: {
    id: string;
    name: string;
  };
  assignedCampusId: string | null;
  campuses: AcademicStructureCampus[];
  faculties: AcademicFacultyRecord[];
}

export interface AcademicStructureRepository {
  getLocalAdminScope(
    administratorId: string,
  ): Promise<AcademicStructureScope | null>;
  list(
    scope: AcademicStructureScope,
  ): Promise<AcademicStructureRecord>;
  createFaculty(
    scope: AcademicStructureScope,
    draft: FacultyDraft,
    actor: AcademicStructureActor,
  ): Promise<AcademicFacultyRecord>;
  updateFaculty(
    scope: AcademicStructureScope,
    facultyId: string,
    draft: Pick<FacultyDraft, 'name' | 'acronym'>,
    actor: AcademicStructureActor,
  ): Promise<AcademicFacultyRecord | null>;
  setFacultyStatus(
    scope: AcademicStructureScope,
    facultyId: string,
    status: AcademicEntityStatus,
    actor: AcademicStructureActor,
  ): Promise<AcademicFacultyRecord | null>;
  createCareer(
    scope: AcademicStructureScope,
    facultyId: string,
    draft: CareerDraft,
    actor: AcademicStructureActor,
  ): Promise<AcademicCareerRecord | null>;
  updateCareer(
    scope: AcademicStructureScope,
    careerId: string,
    draft: CareerDraft,
    actor: AcademicStructureActor,
  ): Promise<AcademicCareerRecord | null>;
  setCareerStatus(
    scope: AcademicStructureScope,
    careerId: string,
    status: AcademicEntityStatus,
    actor: AcademicStructureActor,
  ): Promise<AcademicCareerRecord | null>;
}

export const ACADEMIC_STRUCTURE_REPOSITORY = Symbol(
  'ACADEMIC_STRUCTURE_REPOSITORY',
);
