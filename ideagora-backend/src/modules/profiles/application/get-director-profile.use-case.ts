import { Inject, Injectable } from '@nestjs/common';
import {
  DIRECTOR_PROFILE_REPOSITORY,
  type DirectorProfileRepository,
} from '../domain/director-profile-repository.js';

@Injectable()
export class GetDirectorProfileUseCase {
  constructor(
    @Inject(DIRECTOR_PROFILE_REPOSITORY)
    private readonly repository: DirectorProfileRepository,
  ) {}

  execute(userId: string) {
    return this.repository.findForDirector(userId);
  }
}
