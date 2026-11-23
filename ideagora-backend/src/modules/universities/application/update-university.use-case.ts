import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  UNIVERSITY_REPOSITORY,
  type UniversityActor,
  type UniversityDraft,
  type UniversityRepository,
} from '../domain/university-repository.js';
import { normalizeUniversityDraft } from './university-domain.util.js';

@Injectable()
export class UpdateUniversityUseCase {
  constructor(
    @Inject(UNIVERSITY_REPOSITORY)
    private readonly universityRepository: UniversityRepository,
  ) {}

  async execute(
    id: string,
    input: UniversityDraft,
    actor: UniversityActor,
  ) {
    const university = await this.universityRepository.update(
      id,
      normalizeUniversityDraft(input),
      actor,
    );
    if (!university) {
      throw new NotFoundException('Universidad no encontrada.');
    }
    return university;
  }
}
