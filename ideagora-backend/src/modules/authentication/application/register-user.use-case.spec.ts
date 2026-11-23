import { createHash } from 'node:crypto';
import { ConflictException, BadRequestException } from '@nestjs/common';
import type {
  AuthenticationRepository,
  RegistrationOptions,
  VerificationEmailSender,
} from '../domain/authentication-repository.js';
import { RegisterUserUseCase } from './register-user.use-case.js';

const options: RegistrationOptions = {
  university: { id: 'university-id', name: 'Universidad de prueba' },
  campusId: 'campus-id',
  faculties: [],
  interests: [],
};

describe('RegisterUserUseCase', () => {
  let repository: AuthenticationRepository;
  let emailSender: VerificationEmailSender;
  let useCase: RegisterUserUseCase;
  let getRegistrationOptions: ReturnType<typeof vi.fn>;
  let emailExists: ReturnType<typeof vi.fn>;
  let facultyAndCareerBelongToUniversity: ReturnType<typeof vi.fn>;
  let createPendingUser: ReturnType<typeof vi.fn>;
  let sendVerificationEmail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getRegistrationOptions = vi.fn().mockResolvedValue(options);
    emailExists = vi.fn().mockResolvedValue(false);
    facultyAndCareerBelongToUniversity = vi.fn().mockResolvedValue(true);
    createPendingUser = vi.fn().mockResolvedValue(undefined);
    sendVerificationEmail = vi.fn().mockResolvedValue(undefined);
    repository = {
      findLoginAccount: vi.fn(),
      clearExpiredLoginLock: vi.fn(),
      recordFailedLogin: vi.fn(),
      createAuthenticatedSession: vi.fn(),
      findRefreshSession: vi.fn(),
      rotateRefreshSession: vi.fn(),
      revokeRefreshSession: vi.fn(),
      acceptAdminInvitation: vi.fn(),
      getRegistrationOptions,
      emailExists,
      facultyAndCareerBelongToUniversity,
      findExistingInterestIds: vi.fn().mockResolvedValue([]),
      createPendingUser,
      findPendingUser: vi.fn().mockResolvedValue(null),
      issueVerificationToken: vi.fn().mockResolvedValue(undefined),
      findVerificationToken: vi.fn(),
      consumeAndActivateVerificationToken: vi.fn(),
    };
    emailSender = { sendVerificationEmail };
    useCase = new RegisterUserUseCase(
      repository,
      {
        hash: vi.fn().mockResolvedValue('bcrypt-hash'),
        compare: vi.fn(),
      },
      emailSender,
    );
  });

  it('creates a pending account and sends a raw token while storing only its hash', async () => {
    await useCase.execute({
      firstName: ' Ada ',
      lastName: ' Lovelace ',
      email: 'ADA@UNIVERSIDAD.EDU',
      password: 'StrongPass123',
      facultyId: 'faculty-id',
      careerId: 'career-id',
      interestIds: [],
    });

    expect(createPendingUser).toHaveBeenCalledOnce();
    const savedData = createPendingUser.mock.calls[0][0];
    const sentEmail = sendVerificationEmail.mock.calls[0][0];
    expect(savedData).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@universidad.edu',
      passwordHash: 'bcrypt-hash',
      universityId: 'university-id',
      campusId: 'campus-id',
    });
    expect(facultyAndCareerBelongToUniversity).toHaveBeenCalledWith(
      'faculty-id',
      'career-id',
      'university-id',
      'campus-id',
    );
    expect(savedData).not.toHaveProperty('role');
    expect(savedData.verificationTokenHash).toBe(
      createHash('sha256').update(sentEmail.token).digest('hex'),
    );
    expect(savedData.verificationTokenHash).not.toBe(sentEmail.token);
    expect(sendVerificationEmail).toHaveBeenCalledOnce();
  });

  it('rejects a previously registered email without creating a user', async () => {
    emailExists.mockResolvedValue(true);

    await expect(
      useCase.execute({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@universidad.edu',
        password: 'StrongPass123',
        facultyId: 'faculty-id',
        careerId: 'career-id',
        interestIds: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(createPendingUser).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('rejects email domains without an active university', async () => {
    getRegistrationOptions.mockResolvedValue(null);

    await expect(
      useCase.execute({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@unavailable.edu',
        password: 'StrongPass123',
        facultyId: 'faculty-id',
        careerId: 'career-id',
        interestIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createPendingUser).not.toHaveBeenCalled();
  });
});
