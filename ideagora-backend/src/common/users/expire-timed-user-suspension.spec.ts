import type { PrismaService } from '../../prisma/prisma.service.js';
import { expireTimedUserSuspension } from './expire-timed-user-suspension.js';

function createPrismaFixture(currentSuspension: { id: string } | null = null) {
  const expired = {
    id: 'suspension-id',
    ends_at: new Date('2025-01-01T00:00:00.000Z'),
    reason: 'Prueba',
  };
  const findFirst = vi
    .fn()
    .mockResolvedValueOnce(expired)
    .mockResolvedValueOnce(currentSuspension);
  const updateManyUser = vi.fn().mockResolvedValue({ count: 1 });
  const updateManySuspensions = vi.fn().mockResolvedValue({ count: 1 });
  const createAudit = vi.fn().mockResolvedValue(undefined);
  const transaction = {
    user_suspensions: { findFirst, updateMany: updateManySuspensions },
    users: { updateMany: updateManyUser },
    audit_logs: { create: createAudit },
  };
  const prisma = {
    $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  } as unknown as PrismaService;
  return {
    prisma,
    findFirst,
    updateManyUser,
    updateManySuspensions,
    createAudit,
  };
}

describe('expireTimedUserSuspension', () => {
  it('reactivates an account and audits when its last temporary suspension expired', async () => {
    const now = new Date('2025-01-02T00:00:00.000Z');
    const { prisma, updateManyUser, updateManySuspensions, createAudit } =
      createPrismaFixture();

    await expireTimedUserSuspension(prisma, 'user-id', now);

    expect(updateManyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-id', status: 'SUSPENDED' },
        data: expect.objectContaining({ status: 'ACTIVE', updated_at: now }),
      }),
    );
    expect(updateManySuspensions).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          user_id: 'user-id',
          lifted_at: null,
          ends_at: { lte: now },
        },
      }),
    );
    expect(createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'USER_SUSPENSION_EXPIRED',
          entity_id: 'user-id',
        }),
      }),
    );
  });

  it('keeps the account suspended if another permanent suspension is active', async () => {
    const { prisma, updateManyUser, updateManySuspensions, createAudit } =
      createPrismaFixture({ id: 'permanent-suspension-id' });

    await expireTimedUserSuspension(
      prisma,
      'user-id',
      new Date('2025-01-02T00:00:00.000Z'),
    );

    expect(updateManyUser).not.toHaveBeenCalled();
    expect(updateManySuspensions).not.toHaveBeenCalled();
    expect(createAudit).not.toHaveBeenCalled();
  });
});
