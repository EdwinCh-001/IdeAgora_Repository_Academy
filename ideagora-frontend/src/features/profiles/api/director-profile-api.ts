import { apiClient } from '../../../shared/api/api-client'
import type {
  DirectorProfile,
  DirectorProfileDraft,
  DirectorProfileReviewDecision,
  DirectorReviewProfile,
} from '../types/director-profile'

export const directorProfileApi = {
  async get(): Promise<DirectorProfile | null> {
    const response =
      await apiClient.get<DirectorProfile | null>('/profiles/me')
    return response.data
  },

  async save(payload: DirectorProfileDraft): Promise<DirectorProfile> {
    const response = await apiClient.put<DirectorProfile>(
      '/profiles/me',
      payload,
    )
    return response.data
  },

  async uploadDocument(file: File): Promise<DirectorProfile> {
    const data = new FormData()
    data.append('file', file)
    const response = await apiClient.post<DirectorProfile>(
      '/profiles/me/documents',
      data,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },

  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/profiles/me/documents/${documentId}`,
      { responseType: 'blob' },
    )
    return response.data
  },
}

export const directorProfileReviewApi = {
  async list(): Promise<DirectorReviewProfile[]> {
    const response = await apiClient.get<DirectorReviewProfile[]>(
      '/profiles/review-queue',
    )
    return response.data
  },

  async review(
    profileId: string,
    decision: DirectorProfileReviewDecision,
    reason?: string,
  ): Promise<{ profileId: string; validationStatus: string }> {
    const payload = {
      decision,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }
    const response = await apiClient.patch<{
      profileId: string
      validationStatus: string
    }>(`/profiles/${profileId}/review`, payload)
    return response.data
  },

  async downloadDocument(
    profileId: string,
    documentId: string,
  ): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/profiles/review-queue/${profileId}/documents/${documentId}`,
      { responseType: 'blob' },
    )
    return response.data
  },
}
