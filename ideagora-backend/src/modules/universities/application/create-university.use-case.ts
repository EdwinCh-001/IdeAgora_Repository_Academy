import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  UNIVERSITY_REPOSITORY,
  type UniversityActor,
  type UniversityDraft,
  type UniversityRepository,
} from '../domain/university-repository.js';
import { normalizeUniversityDraft } from './university-domain.util.js';

@Injectable()
export class CreateUniversityUseCase {
  constructor(
    @Inject(UNIVERSITY_REPOSITORY)
    private readonly universityRepository: UniversityRepository,
  ) {}

  execute(input: UniversityDraft, actor: UniversityActor) {
    if (input.campuses.some((campus) => campus.id)) {
      throw new BadRequestException(
        'No se pueden enviar IDs de sede al crear una universidad.',
      );
    }
    return this.universityRepository.create(
      normalizeUniversityDraft(input),
      actor,
    );
  }
}
