import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { DownloadDirectorDocumentUseCase } from './application/download-director-document.use-case.js';
import { DownloadReviewDirectorDocumentUseCase } from './application/download-review-director-document.use-case.js';
import { GetDirectorProfileUseCase } from './application/get-director-profile.use-case.js';
import { ListPendingDirectorProfilesUseCase } from './application/list-pending-director-profiles.use-case.js';
import { ReviewDirectorProfileUseCase } from './application/review-director-profile.use-case.js';
import { SaveDirectorProfileUseCase } from './application/save-director-profile.use-case.js';
import { UploadDirectorDocumentUseCase } from './application/upload-director-document.use-case.js';
import { DIRECTOR_PROFILE_REPOSITORY } from './domain/director-profile-repository.js';
import { DirectorDocumentStorage } from './infrastructure/director-document.storage.js';
import { PrismaDirectorProfileRepository } from './infrastructure/prisma-director-profile.repository.js';
import { DirectorProfileController } from './presentation/director-profile.controller.js';
import { DirectorProfileReviewController } from './presentation/director-profile-review.controller.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
  imports: [AuthenticationModule, PrismaModule],
  controllers: [DirectorProfileController, DirectorProfileReviewController],
  providers: [
    GetDirectorProfileUseCase,
    SaveDirectorProfileUseCase,
    UploadDirectorDocumentUseCase,
    DownloadDirectorDocumentUseCase,
    ListPendingDirectorProfilesUseCase,
    ReviewDirectorProfileUseCase,
    DownloadReviewDirectorDocumentUseCase,
    DirectorDocumentStorage,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: DIRECTOR_PROFILE_REPOSITORY,
      useClass: PrismaDirectorProfileRepository,
    },
  ],
})
export class ProfilesModule {}
