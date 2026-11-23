import { apiClient } from '../../../shared/api/api-client'
import type {
  ManagedUser,
  UserManagementActionPayload,
} from '../types/managed-user'

export const userManagementApi = {
  async list(): Promise<ManagedUser[]> {
    const response =
      await apiClient.get<ManagedUser[]>('/administration/users')
    return response.data
  },

  async suspend(
    id: string,
    payload: UserManagementActionPayload & {
      permanent: boolean
      endsAt: string | null
    },
  ): Promise<ManagedUser> {
    const response = await apiClient.post<ManagedUser>(
      `/administration/users/${id}/suspension`,
      payload,
    )
    return response.data
  },

  async reactivate(
    id: string,
    payload: UserManagementActionPayload,
  ): Promise<ManagedUser> {
    const response = await apiClient.post<ManagedUser>(
      `/administration/users/${id}/reactivation`,
      payload,
    )
    return response.data
  },
}
