import type { PrismaService } from '../../../prisma/prisma.service.js';
import { PrismaDirectorProfileRepository } from './prisma-director-profile.repository.js';

function createRepository(administrator: {
  university_id: string
  campus_id: string | null
  campuses: { university_id: string } | null
}) {
  const findMany = vi.fn().mockResolvedValue([])
  const prisma = {
    users: { findFirst: vi.fn().mockResolvedValue(administrator) },
    director_profiles: { findMany },
  } as unknown as PrismaService
  return {
    repository: new PrismaDirectorProfileRepository(prisma),
    findMany,
  }
}

describe('PrismaDirectorProfileRepository review scope', () => {
  it('limits a campus administrator to directors assigned to that campus', async () => {
    const campusId = 'campus-id'
    const { repository, findMany } = createRepository({
      university_id: 'university-id',
      campus_id: campusId,
      campuses: { university_id: 'university-id' },
    })

    await repository.listPendingForAdministrator('local-admin-id')

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          users_director_profiles_user_idTousers: {
            is: expect.objectContaining({
              role: 'DIRECTOR',
              status: 'ACTIVE',
              university_id: 'university-id',
              campus_id: campusId,
            }),
          },
        }),
      }),
    )
  })

  it('limits a university administrator to active directors in that university', async () => {
    const { repository, findMany } = createRepository({
      university_id: 'university-id',
      campus_id: null,
      campuses: null,
    })

    await repository.listPendingForAdministrator('local-admin-id')

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          users_director_profiles_user_idTousers: {
            is: {
              role: 'DIRECTOR',
              status: 'ACTIVE',
              university_id: 'university-id',
            },
          },
        }),
      }),
    )
  })
})
