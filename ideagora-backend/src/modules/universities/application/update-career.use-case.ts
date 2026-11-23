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
export class UpdateCareerUseCase {
  constructor(
    @Inject(ACADEMIC_STRUCTURE_REPOSITORY)
    private readonly repository: AcademicStructureRepository,
  ) {}

  async execute(
    careerId: string,
    draft: CareerDraft,
    actor: AcademicStructureActor,
  ) {
    const scope = await requireAcademicStructureScope(
      this.repository,
      actor.id,
    );
    const career = await this.repository.updateCareer(
      scope,
      careerId,
      normalizeCareerDraft(draft),
      actor,
    );
    if (!career) {
      throw new NotFoundException('Carrera no encontrada.');
    }
    return career;
  }
}
