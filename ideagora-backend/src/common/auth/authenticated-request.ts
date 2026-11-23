import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/authentication/domain/authentication-repository.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
