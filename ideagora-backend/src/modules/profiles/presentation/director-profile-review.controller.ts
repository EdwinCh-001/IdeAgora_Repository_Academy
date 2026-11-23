import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/auth/authenticated-request.js';
import { Roles } from '../../../common/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { DownloadReviewDirectorDocumentUseCase } from '../application/download-review-director-document.use-case.js';
import { ListPendingDirectorProfilesUseCase } from '../application/list-pending-director-profiles.use-case.js';
import { ReviewDirectorProfileUseCase } from '../application/review-director-profile.use-case.js';
import type { DirectorProfileActor } from '../domain/director-profile-repository.js';
import { ReviewDirectorProfileDto } from './dto/review-director-profile.dto.js';

@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN_LOCAL')
export class DirectorProfileReviewController {
  constructor(
    private readonly listPendingProfiles: ListPendingDirectorProfilesUseCase,
    private readonly reviewDirectorProfile: ReviewDirectorProfileUseCase,
    private readonly downloadReviewDocument: DownloadReviewDirectorDocumentUseCase,
  ) {}

  @Get('review-queue')
  list(@Req() request: AuthenticatedRequest) {
    return this.listPendingProfiles.execute(this.getActor(request).id);
  }

  @Patch(':profileId/review')
  review(
    @Param('profileId', new ParseUUIDPipe()) profileId: string,
    @Body() body: ReviewDirectorProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviewDirectorProfile.execute(
      this.getActor(request),
      profileId,
      body.decision,
      body.reason,
    );
  }

  @Get('review-queue/:profileId/documents/:documentId')
  async download(
    @Param('profileId', new ParseUUIDPipe()) profileId: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    const document = await this.downloadReviewDocument.execute(
      this.getActor(request).id,
      profileId,
      documentId,
    );
    return new StreamableFile(document.content, {
      type: 'application/pdf',
      disposition: `attachment; filename="${document.fileName}"`,
    });
  }

  private getActor(request: AuthenticatedRequest): DirectorProfileActor {
    if (!request.user) {
      throw new UnauthorizedException('Inicia sesión para continuar.');
    }
    return {
      id: request.user.id,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      ipAddress: request.ip ?? null,
    };
  }
}
