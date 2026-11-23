import { Inject, Injectable } from '@nestjs/common';
import {
  ACADEMIC_STRUCTURE_REPOSITORY,
  type AcademicStructureRepository,
} from '../domain/academic-structure-repository.js';
import { requireAcademicStructureScope } from './academic-structure.util.js';

@Injectable()
export class GetAcademicStructureUseCase {
  constructor(
    @Inject(ACADEMIC_STRUCTURE_REPOSITORY)
    private readonly repository: AcademicStructureRepository,
  ) {}

  async execute(administratorId: string) {
    const scope = await requireAcademicStructureScope(
      this.repository,
      administratorId,
    );
    return this.repository.list(scope);
  }
}
