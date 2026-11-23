import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../modules/authentication/domain/authentication-repository.js';

export const ROLES_KEY = 'allowed_roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
