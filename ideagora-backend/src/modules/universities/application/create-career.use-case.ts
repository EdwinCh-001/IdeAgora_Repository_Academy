import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACADEMIC_STRUCTURE_REPOSITORY,
  type AcademicStructureActor,
  type AcademicStructureRepository,
  type CareerDraft,
} from '../domain/academic-structure-repository.js';
import {
  normalizeCareerDraft,
  requireAcademicStructureScope,
} from './academic-structure.util.js';

@Injectable()
export class CreateCareerUseCase {
  constructor(
    @Inject(ACADEMIC_STRUCTURE_REPOSITORY)
    private readonly repository: AcademicStructureRepository,
  ) {}

  async execute(
    facultyId: string,
    draft: CareerDraft,
    actor: AcademicStructureActor,
  ) {
    const scope = await requireAcademicStructureScope(
      this.repository,
      actor.id,
    );
    const career = await this.repository.createCareer(
      scope,
      facultyId,
      normalizeCareerDraft(draft),
      actor,
    );
    if (!career) {
      throw new NotFoundException(
        'Facultad no encontrada, fuera de tu ámbito o inactiva.',
      );
    }
    return career;
  }
}
