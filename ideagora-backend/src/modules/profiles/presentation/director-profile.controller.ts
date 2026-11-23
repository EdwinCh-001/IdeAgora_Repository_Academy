import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../../../common/auth/authenticated-request.js';
import { Roles } from '../../../common/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { DownloadDirectorDocumentUseCase } from '../application/download-director-document.use-case.js';
import { GetDirectorProfileUseCase } from '../application/get-director-profile.use-case.js';
import { SaveDirectorProfileUseCase } from '../application/save-director-profile.use-case.js';
import { UploadDirectorDocumentUseCase } from '../application/upload-director-document.use-case.js';
import type { DirectorProfileActor } from '../domain/director-profile-repository.js';
import type { UploadedPdfFile } from '../infrastructure/director-document.storage.js';
import { SaveDirectorProfileDto } from './dto/save-director-profile.dto.js';

@Controller('profiles/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTOR')
export class DirectorProfileController {
  constructor(
    private readonly getDirectorProfile: GetDirectorProfileUseCase,
    private readonly saveDirectorProfile: SaveDirectorProfileUseCase,
    private readonly uploadDirectorDocument: UploadDirectorDocumentUseCase,
    private readonly downloadDirectorDocument: DownloadDirectorDocumentUseCase,
  ) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.getDirectorProfile.execute(this.getActor(request).id);
  }

  @Put()
  save(
    @Body() body: SaveDirectorProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.saveDirectorProfile.execute(this.getActor(request), {
      summary: body.summary,
      specializations: body.specializations,
      academicDegrees: body.academicDegrees,
      workExperience: body.workExperience,
      externalLinks: body.externalLinks,
    });
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @UploadedFile() file: UploadedPdfFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.uploadDirectorDocument.execute(this.getActor(request), file);
  }

  @Get('documents/:documentId')
  async download(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    const document = await this.downloadDirectorDocument.execute(
      this.getActor(request).id,
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
