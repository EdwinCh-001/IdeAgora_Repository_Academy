import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { UniversityActor } from '../domain/university-repository.js';
import { PrismaUniversityRepository } from './prisma-university.repository.js';

const actor: UniversityActor = {
  id: 'global-admin-id',
  firstName: 'Ada',
  lastName: 'Lovelace',
  ipAddress: null,
};

function createRepository(activeAdministrators: number) {
  const updatedStatus =
    activeAdministrators > 0 ? 'ACTIVE' : 'PENDING';
  const record = {
    id: 'university-id',
    accreditation_code: 'EPN-RUC',
    name: 'Escuela Politecnica Nacional',
    acronym: 'EPN',
    province: 'Pichincha',
    city: 'Quito',
    website: null,
    status: updatedStatus,
    created_at: new Date(),
    updated_at: new Date(),
    campuses: [],
    university_domains: [],
    users: [],
  };
  const transactionMock = {
    universities: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'university-id',
        name: 'Escuela Politecnica Nacional',
        status: 'INACTIVE',
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    users: { count: vi.fn().mockResolvedValue(activeAdministrators) },
    audit_logs: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn(
      async (
        callback: (transaction: typeof transactionMock) => Promise<unknown>,
      ) => callback(transactionMock),
    ),
    universities: {
      findUnique: vi.fn().mockResolvedValue(record),
    },
  } as unknown as PrismaService;

  return {
    repository: new PrismaUniversityRepository(prisma),
    transaction: transactionMock,
  };
}

describe('PrismaUniversityRepository.reactivate', () => {
  it('keeps the university pending when no local administrator is active', async () => {
    const { repository, transaction } = createRepository(0);

    await repository.reactivate('university-id', actor);

    expect(transaction.universities.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PENDING' } }),
    );
    expect(transaction.audit_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UNIVERSITY_REACTIVATED',
          actor_id: actor.id,
          metadata: expect.objectContaining({ status: 'PENDING' }),
        }),
      }),
    );
  });

  it('activates the university when it already has an active local administrator', async () => {
    const { repository, transaction } = createRepository(1);

    await repository.reactivate('university-id', actor);

    expect(transaction.universities.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ACTIVE' } }),
    );
    expect(transaction.audit_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UNIVERSITY_REACTIVATED',
          metadata: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      }),
    );
  });
});
