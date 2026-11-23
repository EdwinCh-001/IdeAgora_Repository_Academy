import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import {
  USER_MANAGEMENT_REPOSITORY,
  type UserManagementActor,
  type UserManagementRepository,
} from '../domain/user-management-repository.js';
import { requireAdministrator } from './user-management.util.js';

@Injectable()
export class ListManagedUsersUseCase {
  constructor(
    @Inject(USER_MANAGEMENT_REPOSITORY)
    private readonly repository: UserManagementRepository,
  ) {}

  async execute(actor: UserManagementActor) {
    const administrator = await requireAdministrator(
      this.repository,
      actor,
    );
    const users = await this.repository.listUsers(
      actor.id,
      administrator.role,
    );
    if (!users) {
      throw new ForbiddenException(
        'No tienes permisos para consultar estas cuentas.',
      );
    }
    return users;
  }
}
