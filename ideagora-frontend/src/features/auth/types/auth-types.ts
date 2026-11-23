export type UserRole = 'ADMIN_GLOBAL' | 'ADMIN_LOCAL' | 'STUDENT' | 'DIRECTOR'

export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

export interface AuthSession {
  accessToken: string
  user: AuthenticatedUser
}

export interface RegistrationOptions {
  university: {
    id: string
    name: string
  }
  campusId: string | null
  faculties: Array<{
    id: string
    name: string
    careers: Array<{
      id: string
      name: string
    }>
  }>
  interests: Array<{
    id: string
    name: string
  }>
}

export interface RegisterUserPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  facultyId: string
  careerId: string
  interestIds: string[]
}
