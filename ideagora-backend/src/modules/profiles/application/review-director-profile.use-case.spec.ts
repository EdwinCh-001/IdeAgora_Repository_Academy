import { BadRequestException } from '@nestjs/common'
import type {
  DirectorProfileActor,
  DirectorProfileRepository,
  DirectorReviewProfile,
} from '../domain/director-profile-repository.js'
import { ReviewDirectorProfileUseCase } from './review-director-profile.use-case.js'

const actor: DirectorProfileActor = {
  id: 'admin-id',
  firstName: 'Ada',
  lastName: 'Lovelace',
  ipAddress: '127.0.0.1',
}

const pendingProfile: DirectorReviewProfile = {
  id: 'profile-id',
  summary: 'Resumen profesional con experiencia académica.',
  specializations: ['Investigación'],
  academicDegrees: ['Doctorado'],
  workExperience: ['Directora de investigación'],
  externalLinks: [],
  validationStatus: 'PENDING',
  rejectionReason: null,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  documents: [],
  director: {
    id: 'director-id',
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@university.edu',
    universityName: 'Universidad',
    campusName: null,
  },
}

function createUseCase(profile: DirectorReviewProfile | null = pendingProfile) {
  const reviewProfile = vi.fn().mockResolvedValue('APPROVED')
  const repository: DirectorProfileRepository = {
    findForDirector: vi.fn(),
    saveForDirector: vi.fn(),
    addDocument: vi.fn(),
    findDocumentForDirector: vi.fn(),
    listPendingForAdministrator: vi.fn(),
    findPendingForAdministrator: vi.fn().mockResolvedValue(profile),
    findDocumentForAdministrator: vi.fn(),
    reviewProfile,
  }
  return {
    useCase: new ReviewDirectorProfileUseCase(repository),
    reviewProfile,
  }
}

describe('ReviewDirectorProfileUseCase', () => {
  it('requires a rejection reason and does not change the profile without one', async () => {
    const { useCase, reviewProfile } = createUseCase()

    await expect(
      useCase.execute(actor, 'profile-id', 'REJECTED', '  '),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(reviewProfile).not.toHaveBeenCalled()
  })

  it('does not approve a profile missing required professional information', async () => {
    const incompleteProfile = {
      ...pendingProfile,
      workExperience: [],
    }
    const { useCase, reviewProfile } = createUseCase(incompleteProfile)

    await expect(
      useCase.execute(actor, 'profile-id', 'APPROVED'),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(reviewProfile).not.toHaveBeenCalled()
  })

  it('records an approval after all required profile fields are present', async () => {
    const { useCase, reviewProfile } = createUseCase()

    const result = await useCase.execute(actor, 'profile-id', 'APPROVED')

    expect(result).toMatchObject({
      profileId: 'profile-id',
      validationStatus: 'APPROVED',
      rejectionReason: null,
    })
    expect(reviewProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        actor,
        profileId: 'profile-id',
        decision: 'APPROVED',
      }),
    )
  })
})
