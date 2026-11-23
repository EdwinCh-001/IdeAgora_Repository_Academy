import { Inject, Injectable } from '@nestjs/common';
import {
  ACADEMIC_STRUCTURE_REPOSITORY,
  type AcademicStructureActor,
  type AcademicStructureRepository,
  type FacultyDraft,
} from '../domain/academic-structure-repository.js';
import {
  normalizeFacultyDraft,
  requireAcademicStructureScope,
  resolveFacultyCampus,
} from './academic-structure.util.js';

@Injectable()
export class CreateFacultyUseCase {
  constructor(
    @Inject(ACADEMIC_STRUCTURE_REPOSITORY)
    private readonly repository: AcademicStructureRepository,
  ) {}

  async execute(
    draft: FacultyDraft,
    actor: AcademicStructureActor,
  ) {
    const scope = await requireAcademicStructureScope(
      this.repository,
      actor.id,
    );
    const normalized = normalizeFacultyDraft(draft);
    normalized.campusId = resolveFacultyCampus(scope, normalized.campusId);
    return this.repository.createFaculty(scope, normalized, actor);
  }
}
