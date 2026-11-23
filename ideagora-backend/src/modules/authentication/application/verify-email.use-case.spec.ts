import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { AuthenticationRepository } from '../domain/authentication-repository.js';
import { VerifyEmailUseCase } from './verify-email.use-case.js';

describe('VerifyEmailUseCase', () => {
  it('hashes the presented token and activates its pending account', async () => {
    const verification = {
      id: 'verification-id',
      userId: 'user-id',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      userStatus: 'PENDING_VERIFICATION',
    };
    const findVerificationToken = vi.fn().mockResolvedValue(verification);
    const consumeAndActivateVerificationToken = vi.fn().mockResolvedValue(true);
    const repository: AuthenticationRepository = {
      findLoginAccount: vi.fn(),
      clearExpiredLoginLock: vi.fn(),
      recordFailedLogin: vi.fn(),
      createAuthenticatedSession: vi.fn(),
      findRefreshSession: vi.fn(),
      rotateRefreshSession: vi.fn(),
      revokeRefreshSession: vi.fn(),
      acceptAdminInvitation: vi.fn(),
      getRegistrationOptions: vi.fn(),
      emailExists: vi.fn(),
      facultyAndCareerBelongToUniversity: vi.fn(),
      findExistingInterestIds: vi.fn(),
      createPendingUser: vi.fn(),
      findPendingUser: vi.fn(),
      issueVerificationToken: vi.fn(),
      findVerificationToken,
      consumeAndActivateVerificationToken,
    };
    const useCase = new VerifyEmailUseCase(repository);
    const token = 'a'.repeat(64);

    await expect(useCase.execute(token)).resolves.toEqual({
      message: 'Correo verificado correctamente. Ya puedes iniciar sesión.',
    });
    expect(findVerificationToken).toHaveBeenCalledWith(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(consumeAndActivateVerificationToken).toHaveBeenCalledWith(
      'verification-id',
      'user-id',
      expect.any(Date),
    );
  });

  it('rejects expired verification links', async () => {
    const findVerificationToken = vi.fn().mockResolvedValue({
      id: 'verification-id',
      userId: 'user-id',
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null,
      userStatus: 'PENDING_VERIFICATION',
    });
    const consumeAndActivateVerificationToken = vi.fn();
    const repository: AuthenticationRepository = {
      findLoginAccount: vi.fn(),
      clearExpiredLoginLock: vi.fn(),
      recordFailedLogin: vi.fn(),
      createAuthenticatedSession: vi.fn(),
      findRefreshSession: vi.fn(),
      rotateRefreshSession: vi.fn(),
      revokeRefreshSession: vi.fn(),
      acceptAdminInvitation: vi.fn(),
      getRegistrationOptions: vi.fn(),
      emailExists: vi.fn(),
      facultyAndCareerBelongToUniversity: vi.fn(),
      findExistingInterestIds: vi.fn(),
      createPendingUser: vi.fn(),
      findPendingUser: vi.fn(),
      issueVerificationToken: vi.fn(),
      findVerificationToken,
      consumeAndActivateVerificationToken,
    };
    const useCase = new VerifyEmailUseCase(repository);

    await expect(useCase.execute('b'.repeat(64))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(consumeAndActivateVerificationToken).not.toHaveBeenCalled();
  });
});
