import bcrypt from 'bcrypt';
import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { user_role, user_status } from '../../generated/prisma/enums.js';
import { readInitialAdminCredentials } from './initial-admin-credentials.js';

async function bootstrapGlobalAdmin(prisma: PrismaClient): Promise<void> {
  const credentials = readInitialAdminCredentials(process.env);
  const passwordHash = await bcrypt.hash(credentials.password, 12);
  const result = await prisma.$transaction(
    async (transaction) => {
      const existingGlobalAdmin = await transaction.users.findFirst({
        where: { role: user_role.ADMIN_GLOBAL },
        select: { id: true, email: true, status: true },
      });

      if (existingGlobalAdmin) {
        if (
          existingGlobalAdmin.email.toLowerCase() === credentials.email &&
          existingGlobalAdmin.status === user_status.ACTIVE
        ) {
          return 'already-provisioned' as const;
        }
        throw new Error(
          'Ya existe una cuenta global o la cuenta indicada no es el primer administrador. No se realizaron cambios.',
        );
      }

      const existingAccount = await transaction.users.findUnique({
        where: { email: credentials.email },
        select: { id: true },
      });
      if (existingAccount) {
        throw new Error(
          'El correo ya está asociado a otra cuenta. El bootstrap no cambia roles existentes.',
        );
      }

      const createdAt = new Date();
      const user = await transaction.users.create({
        data: {
          email: credentials.email,
          password_hash: passwordHash,
          first_name: credentials.firstName,
          last_name: credentials.lastName,
          role: user_role.ADMIN_GLOBAL,
          status: user_status.ACTIVE,
          email_verified_at: createdAt,
          failed_login_attempts: 0,
          locked_until: null,
        },
        select: { id: true },
      });

      await transaction.audit_logs.create({
        data: {
          actor_id: user.id,
          actor_name: `${credentials.firstName} ${credentials.lastName}`.slice(
            0,
            200,
          ),
          action: 'ADMIN_GLOBAL_BOOTSTRAPPED',
          entity_type: 'USER',
          entity_id: user.id,
          metadata: {
            email: credentials.email,
            source: 'controlled_bootstrap',
          },
        },
      });
      return 'created' as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (result === 'already-provisioned') {
    console.info('La cuenta global ya estaba aprovisionada; no se modificó.');
    return;
  }
  console.info(
    'Administrador global inicial creado. Inicia sesión en /login con el correo y la contraseña configurados.',
  );
}

async function main(): Promise<void> {
  let prisma: PrismaClient | undefined;
  try {
    prisma = new PrismaClient();
    await bootstrapGlobalAdmin(prisma);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        `No se pudo aprovisionar el administrador (Prisma ${error.code}).`,
      );
    } else {
      console.error(
        error instanceof Error
          ? error.message
          : 'No se pudo aprovisionar el administrador global.',
      );
    }
    process.exitCode = 1;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

await main();
