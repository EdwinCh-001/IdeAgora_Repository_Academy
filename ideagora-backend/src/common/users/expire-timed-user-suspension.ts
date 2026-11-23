import { user_status } from '../../../generated/prisma/client.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const AUTOMATIC_LIFT_REASON =
  'La suspensión temporal finalizó automáticamente.';

export async function expireTimedUserSuspension(
  prisma: PrismaService,
  userId: string,
  now: Date,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const expiredSuspension = await transaction.user_suspensions.findFirst({
      where: {
        user_id: userId,
        lifted_at: null,
        ends_at: { lte: now },
      },
      orderBy: { starts_at: 'desc' },
      select: { id: true, ends_at: true, reason: true },
    });
    if (!expiredSuspension) {
      return;
    }

    const currentSuspension = await transaction.user_suspensions.findFirst({
      where: {
        user_id: userId,
        lifted_at: null,
        OR: [{ ends_at: null }, { ends_at: { gt: now } }],
      },
      select: { id: true },
    });
    if (currentSuspension) {
      return;
    }

    const updatedUser = await transaction.users.updateMany({
      where: { id: userId, status: user_status.SUSPENDED },
      data: {
        status: user_status.ACTIVE,
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: now,
      },
    });
    await transaction.user_suspensions.updateMany({
      where: {
        user_id: userId,
        lifted_at: null,
        ends_at: { lte: now },
      },
      data: {
        lifted_at: now,
        lift_reason: AUTOMATIC_LIFT_REASON,
      },
    });
    if (updatedUser.count === 0) {
      return;
    }

    await transaction.audit_logs.create({
      data: {
        actor_name: 'Sistema',
        action: 'USER_SUSPENSION_EXPIRED',
        entity_type: 'USER',
        entity_id: userId,
        metadata: {
          suspension_id: expiredSuspension.id,
          reason: expiredSuspension.reason,
          ends_at: expiredSuspension.ends_at?.toISOString() ?? null,
          lift_reason: AUTOMATIC_LIFT_REASON,
        } satisfies Prisma.InputJsonObject,
        created_at: now,
      },
    });
  });
}
