import type { PrismaService } from '../../../prisma/prisma.service.js';
import { PrismaAuthenticationRepository } from './prisma-authentication.repository.js';

function createRepository() {
  const campusId = 'campus-id';
  const findDomain = vi.fn().mockResolvedValue({
    university_id: 'university-id',
    campus_id: campusId,
    universities: {
      id: 'university-id',
      name: 'Universidad de prueba',
    },
  });
  const findFaculties = vi.fn().mockResolvedValue([]);
  const findInterests = vi.fn().mockResolvedValue([]);
  const findFaculty = vi.fn().mockResolvedValue({ id: 'faculty-id' });
  const prisma = {
    university_domains: { findFirst: findDomain },
    faculties: { findMany: findFaculties, findFirst: findFaculty },
    interest_catalog: { findMany: findInterests },
  } as unknown as PrismaService;

  return {
    repository: new PrismaAuthenticationRepository(prisma),
    campusId,
    findFaculties,
    findFaculty,
  };
}

describe('PrismaAuthenticationRepository academic campus scope', () => {
  it('only offers university-wide and assigned-campus faculties during registration', async () => {
    const { repository, campusId, findFaculties } = createRepository();

    const options = await repository.getRegistrationOptions(
      'campus.university.edu',
    );

    expect(options?.campusId).toBe(campusId);
    expect(findFaculties).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          university_id: 'university-id',
          OR: [{ campus_id: null }, { campus_id: campusId }],
        }),
      }),
    );
  });

  it('rejects selecting a faculty from another campus during registration', async () => {
    const { repository, campusId, findFaculty } = createRepository();

    await repository.facultyAndCareerBelongToUniversity(
      'faculty-id',
      'career-id',
      'university-id',
      campusId,
    );

    expect(findFaculty).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ campus_id: null }, { campus_id: campusId }],
        }),
      }),
    );
  });
});
