import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import type {
  AuthenticationRepository,
  LoginAccount,
  PasswordHasher,
} from '../domain/authentication-repository.js';
import { LoginUserUseCase } from './login-user.use-case.js';

const activeStudent: LoginAccount = {
  id: 'user-id',
  email: 'student@university.edu',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'STUDENT',
  passwordHash: 'hashed-password',
  status: 'ACTIVE',
  failedLoginAttempts: 0,
  lockedUntil: null,
};

function createLoginFixture(account: LoginAccount | null = activeStudent) {
  const recordFailedLogin = vi.fn().mockResolvedValue(undefined);
  const createAuthenticatedSession = vi.fn().mockResolvedValue(undefined);
  const comparePassword = vi.fn().mockResolvedValue(true);
  const repository: AuthenticationRepository = {
    findLoginAccount: vi.fn().mockResolvedValue(account),
    clearExpiredLoginLock: vi.fn().mockResolvedValue(undefined),
    recordFailedLogin,
    createAuthenticatedSession,
    findRefreshSession: vi.fn(),
    rotateRefreshSession: vi.fn(),
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
  const passwordHasher: PasswordHasher = {
    hash: vi.fn(),
    compare: comparePassword,
  };
  const jwtService = new JwtService({
    secret: 'a'.repeat(48),
    signOptions: { expiresIn: '15m' },
  });
  return {
    repository,
    passwordHasher,
    recordFailedLogin,
    createAuthenticatedSession,
    comparePassword,
    useCase: new LoginUserUseCase(repository, passwordHasher, jwtService),
    jwtService,
  };
}

describe('LoginUserUseCase', () => {
  it('creates a refresh session and returns a JWT for an active account', async () => {
    const { createAuthenticatedSession, useCase, jwtService } =
      createLoginFixture();

    const result = await useCase.execute({
      email: 'STUDENT@UNIVERSITY.EDU',
      password: 'StrongPass123',
      userAgent: 'test browser',
      ipAddress: '127.0.0.1',
    });

    expect(result.user).toMatchObject({
      id: 'user-id',
      role: 'STUDENT',
    });
    expect(await jwtService.verifyAsync(result.accessToken)).toMatchObject({
      sub: 'user-id',
      role: 'STUDENT',
    });
    expect(createAuthenticatedSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        userAgent: 'test browser',
        ipAddress: '127.0.0.1',
      }),
    );
    expect(
      createAuthenticatedSession.mock.calls[0][0].refreshTokenHash,
    ).toHaveLength(64);
  });

  it('uses the same invalid-credentials response and increments failed attempts', async () => {
    const { recordFailedLogin, comparePassword, useCase } =
      createLoginFixture();
    comparePassword.mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: activeStudent.email,
        password: 'incorrect-password',
        userAgent: null,
        ipAddress: null,
      }),
    ).rejects.toMatchObject({
      message: 'Credenciales inválidas.',
      status: 401,
    });
    expect(recordFailedLogin).toHaveBeenCalledWith(
      'user-id',
      5,
      expect.any(Date),
    );
  });

  it('rejects a locked account without checking its password', async () => {
    const lockedAccount = {
      ...activeStudent,
      lockedUntil: new Date(Date.now() + 60_000),
    };
    const { comparePassword, useCase } = createLoginFixture(lockedAccount);

    await expect(
      useCase.execute({
        email: activeStudent.email,
        password: 'StrongPass123',
        userAgent: null,
        ipAddress: null,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(comparePassword).not.toHaveBeenCalled();
  });
});
