import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACADEMIC_STRUCTURE_REPOSITORY,
  type AcademicEntityStatus,
  type AcademicStructureActor,
  type AcademicStructureRepository,
} from '../domain/academic-structure-repository.js';
import { requireAcademicStructureScope } from './academic-structure.util.js';

@Injectable()
export class SetFacultyStatusUseCase {
  constructor(
    @Inject(ACADEMIC_STRUCTURE_REPOSITORY)
    private readonly repository: AcademicStructureRepository,
  ) {}

  async execute(
    facultyId: string,
    status: AcademicEntityStatus,
    actor: AcademicStructureActor,
  ) {
    const scope = await requireAcademicStructureScope(
      this.repository,
      actor.id,
    );
    const faculty = await this.repository.setFacultyStatus(
      scope,
      facultyId,
      status,
      actor,
    );
    if (!faculty) {
      throw new NotFoundException('Facultad no encontrada.');
    }
    return faculty;
  }
}
