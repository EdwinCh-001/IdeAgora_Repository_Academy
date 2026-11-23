import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import {
  ADMIN_INVITATION_EMAIL_SENDER,
  UNIVERSITY_REPOSITORY,
} from './domain/university-repository.js';
import { ACADEMIC_STRUCTURE_REPOSITORY } from './domain/academic-structure-repository.js';
import { CreateUniversityUseCase } from './application/create-university.use-case.js';
import { CreateCareerUseCase } from './application/create-career.use-case.js';
import { CreateFacultyUseCase } from './application/create-faculty.use-case.js';
import { DeactivateUniversityUseCase } from './application/deactivate-university.use-case.js';
import { GetAcademicStructureUseCase } from './application/get-academic-structure.use-case.js';
import { GetUniversityUseCase } from './application/get-university.use-case.js';
import { InviteLocalAdministratorsUseCase } from './application/invite-local-administrators.use-case.js';
import { ListUniversitiesUseCase } from './application/list-universities.use-case.js';
import { ResendAdminInvitationUseCase } from './application/resend-admin-invitation.use-case.js';
import { ReactivateUniversityUseCase } from './application/reactivate-university.use-case.js';
import { SetCareerStatusUseCase } from './application/set-career-status.use-case.js';
import { SetFacultyStatusUseCase } from './application/set-faculty-status.use-case.js';
import { UpdateUniversityUseCase } from './application/update-university.use-case.js';
import { UpdateCareerUseCase } from './application/update-career.use-case.js';
import { UpdateFacultyUseCase } from './application/update-faculty.use-case.js';
import { AdminProfilePhotoStorage } from './infraestructure/admin-profile-photo.storage.js';
import { PrismaAcademicStructureRepository } from './infraestructure/prisma-academic-structure.repository.js';
import { PrismaUniversityRepository } from './infraestructure/prisma-university.repository.js';
import { AcademicStructureController } from './presentation/academic-structure.controller.js';
import { AdminProfilePhotosController } from './presentation/admin-profile-photos.controller.js';
import { UniversitiesController } from './presentation/universities.controller.js';
import { SmtpVerificationEmailSender } from '../authentication/infraestructure/smtp-verification-email.sender.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [AuthenticationModule, PrismaModule],
  controllers: [
    UniversitiesController,
    AcademicStructureController,
    AdminProfilePhotosController,
  ],
  providers: [
    CreateUniversityUseCase,
    GetAcademicStructureUseCase,
    CreateFacultyUseCase,
    UpdateFacultyUseCase,
    SetFacultyStatusUseCase,
    CreateCareerUseCase,
    UpdateCareerUseCase,
    SetCareerStatusUseCase,
    UpdateUniversityUseCase,
    DeactivateUniversityUseCase,
    ReactivateUniversityUseCase,
    ListUniversitiesUseCase,
    GetUniversityUseCase,
    InviteLocalAdministratorsUseCase,
    ResendAdminInvitationUseCase,
    AdminProfilePhotoStorage,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: UNIVERSITY_REPOSITORY,
      useClass: PrismaUniversityRepository,
    },
    {
      provide: ACADEMIC_STRUCTURE_REPOSITORY,
      useClass: PrismaAcademicStructureRepository,
    },
    {
      provide: ADMIN_INVITATION_EMAIL_SENDER,
      useExisting: SmtpVerificationEmailSender,
    },
  ],
})
export class UniversitiesModule {}
