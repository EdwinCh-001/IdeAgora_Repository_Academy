import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  UNIVERSITY_REPOSITORY,
  type UniversityActor,
  type UniversityRepository,
} from '../domain/university-repository.js';

@Injectable()
export class DeactivateUniversityUseCase {
  constructor(
    @Inject(UNIVERSITY_REPOSITORY)
    private readonly universityRepository: UniversityRepository,
  ) {}

  async execute(id: string, actor: UniversityActor) {
    const university = await this.universityRepository.deactivate(id, actor);
    if (!university) {
      throw new NotFoundException('Universidad no encontrada.');
    }
    return university;
  }
}
