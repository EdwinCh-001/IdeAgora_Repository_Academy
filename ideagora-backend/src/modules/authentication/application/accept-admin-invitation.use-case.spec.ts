import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type {
  AuthenticationRepository,
  PasswordHasher,
} from '../domain/authentication-repository.js';
import { AcceptAdminInvitationUseCase } from './accept-admin-invitation.use-case.js';

describe('AcceptAdminInvitationUseCase', () => {
  it('hashes the password and token before accepting the invitation', async () => {
    const acceptAdminInvitation = vi.fn().mockResolvedValue(true);
    const repository: AuthenticationRepository = {
      findLoginAccount: vi.fn(),
      clearExpiredLoginLock: vi.fn(),
      recordFailedLogin: vi.fn(),
      createAuthenticatedSession: vi.fn(),
      findRefreshSession: vi.fn(),
      rotateRefreshSession: vi.fn(),
      revokeRefreshSession: vi.fn(),
      acceptAdminInvitation,
      getRegistrationOptions: vi.fn(),
      emailExists: vi.fn(),
      facultyAndCareerBelongToUniversity: vi.fn(),
      findExistingInterestIds: vi.fn(),
      createPendingUser: vi.fn(),
      findPendingUser: vi.fn(),
      issueVerificationToken: vi.fn(),
      findVerificationToken: vi.fn(),
      consumeAndActivateVerificationToken: vi.fn(),
    };
    const passwordHasher: PasswordHasher = {
      hash: vi.fn().mockResolvedValue('bcrypt-password-hash'),
      compare: vi.fn(),
    };
    const useCase = new AcceptAdminInvitationUseCase(
      repository,
      passwordHasher,
    );
    const token = 'a'.repeat(64);

    await expect(
      useCase.execute({ token, password: 'StrongPass123' }),
    ).resolves.toEqual({
      message: 'Cargo aceptado y contraseña asignada. Ya puedes iniciar sesión.',
    });

    expect(acceptAdminInvitation).toHaveBeenCalledWith(
      createHash('sha256').update(token).digest('hex'),
      'bcrypt-password-hash',
      expect.any(Date),
    );
  });

  it('rejects invitations that are invalid or already used', async () => {
    const repository: AuthenticationRepository = {
      findLoginAccount: vi.fn(),
      clearExpiredLoginLock: vi.fn(),
      recordFailedLogin: vi.fn(),
      createAuthenticatedSession: vi.fn(),
      findRefreshSession: vi.fn(),
      rotateRefreshSession: vi.fn(),
      revokeRefreshSession: vi.fn(),
      acceptAdminInvitation: vi.fn().mockResolvedValue(false),
      getRegistrationOptions: vi.fn(),
      emailExists: vi.fn(),
      facultyAndCareerBelongToUniversity: vi.fn(),
      findExistingInterestIds: vi.fn(),
      createPendingUser: vi.fn(),
      findPendingUser: vi.fn(),
      issueVerificationToken: vi.fn(),
      findVerificationToken: vi.fn(),
      consumeAndActivateVerificationToken: vi.fn(),
    };
    const useCase = new AcceptAdminInvitationUseCase(
      repository,
      { hash: vi.fn().mockResolvedValue('hash'), compare: vi.fn() },
    );

    await expect(
      useCase.execute({ token: 'b'.repeat(64), password: 'StrongPass123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
