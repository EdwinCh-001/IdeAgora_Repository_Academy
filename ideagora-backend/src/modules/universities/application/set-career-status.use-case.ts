import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACADEMIC_STRUCTURE_REPOSITORY,
  type AcademicEntityStatus,
  type AcademicStructureActor,
  type AcademicStructureRepository,
} from '../domain/academic-structure-repository.js';
import { requireAcademicStructureScope } from './academic-structure.util.js';

@Injectable()
export class SetCareerStatusUseCase {
  constructor(
    @Inject(ACADEMIC_STRUCTURE_REPOSITORY)
    private readonly repository: AcademicStructureRepository,
  ) {}

  async execute(
    careerId: string,
    status: AcademicEntityStatus,
    actor: AcademicStructureActor,
  ) {
    const scope = await requireAcademicStructureScope(
      this.repository,
      actor.id,
    );
    const career = await this.repository.setCareerStatus(
      scope,
      careerId,
      status,
      actor,
    );
    if (!career) {
      throw new NotFoundException('Carrera no encontrada.');
    }
    return career;
  }
}
