import { apiClient } from '../../../shared/api/api-client'
import type {
  AcademicCareerRecord,
  AcademicEntityStatus,
  AcademicFacultyRecord,
  AcademicStructureRecord,
  CareerPayload,
  FacultyPayload,
} from '../types/academic-structure-types'

export const academicStructureApi = {
  async get(): Promise<AcademicStructureRecord> {
    const response =
      await apiClient.get<AcademicStructureRecord>('/academic-structure')
    return response.data
  },

  async createFaculty(
    payload: FacultyPayload,
  ): Promise<AcademicFacultyRecord> {
    const response = await apiClient.post<AcademicFacultyRecord>(
      '/academic-structure/faculties',
      payload,
    )
    return response.data
  },

  async updateFaculty(
    id: string,
    payload: Pick<FacultyPayload, 'name' | 'acronym'>,
  ): Promise<AcademicFacultyRecord> {
    const response = await apiClient.put<AcademicFacultyRecord>(
      `/academic-structure/faculties/${id}`,
      payload,
    )
    return response.data
  },

  async setFacultyStatus(
    id: string,
    status: AcademicEntityStatus,
  ): Promise<AcademicFacultyRecord> {
    const response = await apiClient.patch<AcademicFacultyRecord>(
      `/academic-structure/faculties/${id}/status`,
      { status },
    )
    return response.data
  },

  async createCareer(
    facultyId: string,
    payload: CareerPayload,
  ): Promise<AcademicCareerRecord> {
    const response = await apiClient.post<AcademicCareerRecord>(
      `/academic-structure/faculties/${facultyId}/careers`,
      payload,
    )
    return response.data
  },

  async updateCareer(
    id: string,
    payload: CareerPayload,
  ): Promise<AcademicCareerRecord> {
    const response = await apiClient.put<AcademicCareerRecord>(
      `/academic-structure/careers/${id}`,
      payload,
    )
    return response.data
  },

  async setCareerStatus(
    id: string,
    status: AcademicEntityStatus,
  ): Promise<AcademicCareerRecord> {
    const response = await apiClient.patch<AcademicCareerRecord>(
      `/academic-structure/careers/${id}/status`,
      { status },
    )
    return response.data
  },
}
