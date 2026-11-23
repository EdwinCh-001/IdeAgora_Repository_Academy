import type { UserRole } from '../../auth/types/auth-types'
export type { UserRole } from '../../auth/types/auth-types'

export type ManagedUserStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'

export interface ManagedUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  status: ManagedUserStatus
  universityId: string | null
  universityName: string | null
  createdAt: string
  suspension: {
    reason: string
    endsAt: string | null
  } | null
}

export interface UserManagementActionPayload {
  confirmationName: string
  password: string
  reason: string
}
