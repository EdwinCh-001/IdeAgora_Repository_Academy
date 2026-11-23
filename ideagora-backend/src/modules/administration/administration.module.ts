import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { SmtpVerificationEmailSender } from '../authentication/infraestructure/smtp-verification-email.sender.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import {
  USER_MANAGEMENT_REPOSITORY,
  USER_STATUS_EMAIL_SENDER,
} from './domain/user-management-repository.js';
import { ListManagedUsersUseCase } from './application/list-managed-users.use-case.js';
import { ReactivateUserUseCase } from './application/reactivate-user.use-case.js';
import { SuspendUserUseCase } from './application/suspend-user.use-case.js';
import { PrismaUserManagementRepository } from './infrastructure/prisma-user-management.repository.js';
import { UserManagementController } from './presentation/user-management.controller.js';

@Module({
  imports: [AuthenticationModule, PrismaModule],
  controllers: [UserManagementController],
  providers: [
    ListManagedUsersUseCase,
    SuspendUserUseCase,
    ReactivateUserUseCase,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: USER_MANAGEMENT_REPOSITORY,
      useClass: PrismaUserManagementRepository,
    },
    {
      provide: USER_STATUS_EMAIL_SENDER,
      useExisting: SmtpVerificationEmailSender,
    },
  ],
})
export class AdministrationModule {}
