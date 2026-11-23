export type UserRole = 'ADMIN_GLOBAL' | 'ADMIN_LOCAL' | 'STUDENT' | 'DIRECTOR';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginAccount extends AuthenticatedUser {
  passwordHash: string;
  status: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface RefreshSession {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userStatus: string;
  user: AuthenticatedUser;
}

export interface RegistrationOptions {
  university: {
    id: string;
    name: string;
  };
  campusId: string | null;
  faculties: Array<{
    id: string;
    name: string;
    careers: Array<{
      id: string;
      name: string;
    }>;
  }>;
  interests: Array<{
    id: string;
    name: string;
  }>;
}

export interface CreatePendingUser {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  universityId: string;
  campusId: string | null;
  facultyId: string;
  careerId: string;
  interestIds: string[];
  verificationTokenHash: string;
  verificationExpiresAt: Date;
}

export interface VerificationTokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  userStatus: string;
}

export interface PendingUser {
  id: string;
  firstName: string;
}

export interface AuthenticationRepository {
  findLoginAccount(email: string): Promise<LoginAccount | null>;
  clearExpiredLoginLock(userId: string, now: Date): Promise<void>;
  recordFailedLogin(
    userId: string,
    maxAttempts: number,
    lockedUntil: Date,
  ): Promise<void>;
  createAuthenticatedSession(input: {
    userId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    loggedInAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<void>;
  findRefreshSession(tokenHash: string): Promise<RefreshSession | null>;
  rotateRefreshSession(input: {
    sessionId: string;
    now: Date;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<boolean>;
  revokeRefreshSession(
    tokenHash: string,
    loggedOutAt: Date,
    ipAddress: string | null,
  ): Promise<void>;
  acceptAdminInvitation(
    tokenHash: string,
    passwordHash: string,
    acceptedAt: Date,
  ): Promise<boolean>;
  getRegistrationOptions(domain: string): Promise<RegistrationOptions | null>;
  emailExists(email: string): Promise<boolean>;
  facultyAndCareerBelongToUniversity(
    facultyId: string,
    careerId: string,
    universityId: string,
    campusId: string | null,
  ): Promise<boolean>;
  findExistingInterestIds(ids: string[]): Promise<string[]>;
  createPendingUser(data: CreatePendingUser): Promise<void>;
  findPendingUser(email: string): Promise<PendingUser | null>;
  issueVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  findVerificationToken(hash: string): Promise<VerificationTokenRecord | null>;
  consumeAndActivateVerificationToken(
    tokenId: string,
    userId: string,
    verifiedAt: Date,
  ): Promise<boolean>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, passwordHash: string): Promise<boolean>;
}

export interface VerificationEmailSender {
  sendVerificationEmail(input: {
    email: string;
    firstName: string;
    token: string;
  }): Promise<void>;
}

export const AUTHENTICATION_REPOSITORY = Symbol('AUTHENTICATION_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const VERIFICATION_EMAIL_SENDER = Symbol('VERIFICATION_EMAIL_SENDER');
