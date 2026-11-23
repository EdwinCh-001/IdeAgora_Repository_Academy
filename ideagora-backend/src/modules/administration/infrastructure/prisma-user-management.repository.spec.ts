import type { PrismaService } from '../../../../prisma/prisma.service.js';
import { PrismaUserManagementRepository } from './prisma-user-management.repository.js';

function createRepository(
  manager: {
    id: string;
    role: 'ADMIN_GLOBAL' | 'ADMIN_LOCAL';
    university_id: string | null;
  },
) {
  const findMany = vi
    .fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  const prisma = {
    users: {
      findFirst: vi.fn().mockResolvedValue(manager),
      findMany,
    },
  } as unknown as PrismaService;
  return {
    repository: new PrismaUserManagementRepository(prisma),
    findMany,
  };
}

describe('PrismaUserManagementRepository scope', () => {
  it('limits local administrators to student and director accounts in their university', async () => {
    const universityId = 'university-id';
    const { repository, findMany } = createRepository({
      id: 'local-admin',
      role: 'ADMIN_LOCAL',
      university_id: universityId,
    });

    await repository.listUsers('local-admin', 'ADMIN_LOCAL');

    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          university_id: universityId,
          role: { in: ['STUDENT', 'DIRECTOR'] },
        },
      }),
    );
  });

  it('lets global administrators manage local administrators but not other global accounts', async () => {
    const { repository, findMany } = createRepository({
      id: 'global-admin',
      role: 'ADMIN_GLOBAL',
      university_id: null,
    });

    await repository.listUsers('global-admin', 'ADMIN_GLOBAL');

    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          role: { in: ['ADMIN_LOCAL', 'STUDENT', 'DIRECTOR'] },
        },
      }),
    );
  });
});
