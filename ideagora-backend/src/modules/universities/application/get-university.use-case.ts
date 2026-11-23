import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  UNIVERSITY_REPOSITORY,
  type UniversityRepository,
} from '../domain/university-repository.js';

@Injectable()
export class GetUniversityUseCase {
  constructor(
    @Inject(UNIVERSITY_REPOSITORY)
    private readonly universityRepository: UniversityRepository,
  ) {}

  async execute(id: string) {
    const university = await this.universityRepository.findById(id);
    if (!university) {
      throw new NotFoundException('Universidad no encontrada.');
    }
    return university;
  }
}
