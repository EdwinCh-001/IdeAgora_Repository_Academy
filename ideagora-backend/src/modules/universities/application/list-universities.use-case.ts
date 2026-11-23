import { Inject, Injectable } from '@nestjs/common';
import {
  UNIVERSITY_REPOSITORY,
  type UniversityRepository,
} from '../domain/university-repository.js';

@Injectable()
export class ListUniversitiesUseCase {
  constructor(
    @Inject(UNIVERSITY_REPOSITORY)
    private readonly universityRepository: UniversityRepository,
  ) {}

  execute() {
    return this.universityRepository.list();
  }
}
