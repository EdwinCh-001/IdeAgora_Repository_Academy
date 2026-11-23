import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  AuthenticationRepository,
  RefreshSession,
} from '../domain/authentication-repository.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';

const activeSession: RefreshSession = {
  id: 'session-id',
  userId: 'user-id',
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  userStatus: 'ACTIVE',
  user: {
    id: 'user-id',
    email: 'student@university.edu',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: 'STUDENT',
  },
};

function createRefreshFixture(
  session: RefreshSession | null = activeSession,
) {
  const findRefreshSession = vi.fn().mockResolvedValue(session);
  const rotateRefreshSession = vi.fn().mockResolvedValue(true);
  const repository: AuthenticationRepository = {
    findLoginAccount: vi.fn(),
    clearExpiredLoginLock: vi.fn(),
    recordFailedLogin: vi.fn(),
    createAuthenticatedSession: vi.fn(),
    findRefreshSession,
    rotateRefreshSession,
    revokeRefreshSession: vi.fn(),
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
  const jwtService = new JwtService({ secret: 'b'.repeat(48) });
  return {
    findRefreshSession,
    rotateRefreshSession,
    useCase: new RefreshSessionUseCase(repository, jwtService),
  };
}

describe('RefreshSessionUseCase', () => {
  it('hashes the cookie token, rotates it, and returns a new access token', async () => {
    const { findRefreshSession, rotateRefreshSession, useCase } =
      createRefreshFixture();
    const rawToken = 'refresh-secret';

    const result = await useCase.execute(rawToken, 'test browser', '127.0.0.1');

    expect(findRefreshSession).toHaveBeenCalledWith(
      createHash('sha256').update(rawToken).digest('hex'),
    );
    expect(rotateRefreshSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-id',
        userAgent: 'test browser',
        ipAddress: '127.0.0.1',
      }),
    );
    expect(result.refreshToken).not.toBe(rawToken);
    expect(result.accessToken).toBeTruthy();
  });

  it('rejects a missing refresh token', async () => {
    const { findRefreshSession, useCase } = createRefreshFixture();

    await expect(useCase.execute(undefined, null, null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findRefreshSession).not.toHaveBeenCalled();
  });
});
