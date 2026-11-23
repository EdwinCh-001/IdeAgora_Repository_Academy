import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AUTHENTICATION_REPOSITORY,
  type AuthenticationRepository,
} from '../domain/authentication-repository.js';

@Injectable()
export class GetRegistrationOptionsUseCase {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authenticationRepository: AuthenticationRepository,
  ) {}

  async execute(email: string) {
    const domain = email.trim().toLowerCase().split('@').at(-1);
    if (!domain) {
      throw new NotFoundException('La universidad no se encuentra disponible.');
    }

    const options =
      await this.authenticationRepository.getRegistrationOptions(domain);
    if (!options) {
      throw new NotFoundException('La universidad no se encuentra disponible.');
    }

    return options;
  }
}
