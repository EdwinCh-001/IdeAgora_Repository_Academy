import { apiClient } from '../../../shared/api/api-client'
import type {
  UniversityPayload,
  UniversityRecord,
} from '../types/university-types'

export interface LocalAdministratorPayload {
  firstName: string
  lastName: string
  email: string
  emailDomain: string
  phone: string
  jobTitle: string
  campusId: string | null
  avatarUrl: string
}

export const universitiesApi = {
  async list(): Promise<UniversityRecord[]> {
    const response = await apiClient.get<UniversityRecord[]>('/universities')
    return response.data
  },

  async create(payload: UniversityPayload): Promise<UniversityRecord> {
    const response = await apiClient.post<UniversityRecord>(
      '/universities',
      payload,
    )
    return response.data
  },

  async update(
    id: string,
    payload: UniversityPayload,
  ): Promise<UniversityRecord> {
    const response = await apiClient.put<UniversityRecord>(
      `/universities/${id}`,
      payload,
    )
    return response.data
  },

  async deactivate(id: string): Promise<UniversityRecord> {
    const response = await apiClient.delete<UniversityRecord>(
      `/universities/${id}`,
    )
    return response.data
  },

  async reactivate(id: string): Promise<UniversityRecord> {
    const response = await apiClient.post<UniversityRecord>(
      `/universities/${id}/reactivate`,
    )
    return response.data
  },

  async inviteAdministrator(
    universityId: string,
    administrator: LocalAdministratorPayload,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `/universities/${universityId}/administrators`,
      { administrators: [administrator] },
    )
    return response.data
  },

  async resendInvitation(
    universityId: string,
    administratorId: string,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `/universities/${universityId}/administrators/${administratorId}/resend-invitation`,
    )
    return response.data
  },

  async uploadAdministratorPhoto(file: File): Promise<{ url: string }> {
    const data = new FormData()
    data.append('file', file)
    const response = await apiClient.post<{ url: string }>(
      '/universities/admin-profile-photos',
      data,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },
}
