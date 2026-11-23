export type UniversityStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE'

export interface UniversityRecord {
  id: string
  accreditationCode: string
  name: string
  acronym: string | null
  province: string
  city: string
  website: string | null
  status: UniversityStatus
  campuses: Array<{
    id: string
    name: string
    legalName: string | null
    province: string
    city: string
    reference: string | null
    status: 'ACTIVE' | 'INACTIVE'
  }>
  domains: Array<{
    id: string
    domain: string
    campusId: string | null
  }>
  administrators: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    jobTitle: string | null
    avatarUrl: string | null
    campusId: string | null
    status: string
  }>
}

export interface UniversityPayload {
  accreditationCode: string
  name: string
  acronym: string | null
  province: string
  city: string
  website: string | null
  campuses: Array<{
    id?: string
    name: string
    legalName: string | null
    province: string
    city: string
    reference: string | null
  }>
  domains: Array<{
    domain: string
    campusIndex?: number
  }>
}
