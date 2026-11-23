import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  DIRECTOR_PROFILE_REPOSITORY,
  type DirectorProfileRepository,
} from '../domain/director-profile-repository.js';

@Injectable()
export class ListPendingDirectorProfilesUseCase {
  constructor(
    @Inject(DIRECTOR_PROFILE_REPOSITORY)
    private readonly repository: DirectorProfileRepository,
  ) {}

  async execute(administratorId: string) {
    const profiles =
      await this.repository.listPendingForAdministrator(administratorId);
    if (!profiles) {
      throw new ForbiddenException(
        'No tienes una universidad o sede válida asignada para revisar perfiles.',
      );
    }
    return profiles;
  }
}
