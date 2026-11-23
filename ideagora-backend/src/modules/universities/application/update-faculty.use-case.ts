import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACADEMIC_STRUCTURE_REPOSITORY,
  type AcademicStructureActor,
  type AcademicStructureRepository,
} from '../domain/academic-structure-repository.js';
import {
  normalizeFacultyDraft,
  requireAcademicStructureScope,
} from './academic-structure.util.js';

@Injectable()
export class UpdateFacultyUseCase {
  constructor(
    @Inject(ACADEMIC_STRUCTURE_REPOSITORY)
    private readonly repository: AcademicStructureRepository,
  ) {}

  async execute(
    facultyId: string,
    draft: { name: string; acronym: string | null },
    actor: AcademicStructureActor,
  ) {
    const scope = await requireAcademicStructureScope(
      this.repository,
      actor.id,
    );
    const normalized = normalizeFacultyDraft({
      ...draft,
      campusId: scope.campusId,
    });
    const faculty = await this.repository.updateFaculty(
      scope,
      facultyId,
      normalized,
      actor,
    );
    if (!faculty) {
      throw new NotFoundException('Facultad no encontrada.');
    }
    return faculty;
  }
}
