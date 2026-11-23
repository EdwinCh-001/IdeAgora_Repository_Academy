import { Inject, Injectable } from '@nestjs/common';
import {
  DIRECTOR_PROFILE_REPOSITORY,
  type DirectorProfileActor,
  type DirectorProfileDraft,
  type DirectorProfileRepository,
} from '../domain/director-profile-repository.js';

@Injectable()
export class SaveDirectorProfileUseCase {
  constructor(
    @Inject(DIRECTOR_PROFILE_REPOSITORY)
    private readonly repository: DirectorProfileRepository,
  ) {}

  execute(actor: DirectorProfileActor, draft: DirectorProfileDraft) {
    return this.repository.saveForDirector(actor, draft);
  }
}
