import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
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
import { CreateUniversityUseCase } from '../application/create-university.use-case.js';
import { DeactivateUniversityUseCase } from '../application/deactivate-university.use-case.js';
import { GetUniversityUseCase } from '../application/get-university.use-case.js';
import { InviteLocalAdministratorsUseCase } from '../application/invite-local-administrators.use-case.js';
import { ListUniversitiesUseCase } from '../application/list-universities.use-case.js';
import { ResendAdminInvitationUseCase } from '../application/resend-admin-invitation.use-case.js';
import { ReactivateUniversityUseCase } from '../application/reactivate-university.use-case.js';
import { UpdateUniversityUseCase } from '../application/update-university.use-case.js';
import type {
  UniversityActor,
  UniversityDraft,
} from '../domain/university-repository.js';
import {
  AdminProfilePhotoStorage,
  type UploadedImageFile,
} from '../infraestructure/admin-profile-photo.storage.js';
import { InviteLocalAdministratorsDto } from './dto/invite-local-administrators.dto.js';
import { UniversityDto } from './dto/university.dto.js';

@Controller('universities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN_GLOBAL')
export class UniversitiesController {
  constructor(
    private readonly listUniversities: ListUniversitiesUseCase,
    private readonly getUniversity: GetUniversityUseCase,
    private readonly createUniversity: CreateUniversityUseCase,
    private readonly updateUniversity: UpdateUniversityUseCase,
    private readonly deactivateUniversity: DeactivateUniversityUseCase,
    private readonly reactivateUniversity: ReactivateUniversityUseCase,
    private readonly inviteLocalAdministrators: InviteLocalAdministratorsUseCase,
    private readonly resendAdminInvitation: ResendAdminInvitationUseCase,
    private readonly photoStorage: AdminProfilePhotoStorage,
  ) {}

  @Get()
  list() {
    return this.listUniversities.execute();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getUniversity.execute(id);
  }

  @Post()
  create(
    @Body() body: UniversityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createUniversity.execute(
      this.toUniversityDraft(body),
      this.getActor(request),
    );
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UniversityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updateUniversity.execute(
      id,
      this.toUniversityDraft(body),
      this.getActor(request),
    );
  }

  @Delete(':id')
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.deactivateUniversity.execute(id, this.getActor(request));
  }

  @Post(':id/reactivate')
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reactivateUniversity.execute(id, this.getActor(request));
  }

  @Post(':id/administrators')
  invite(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: InviteLocalAdministratorsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inviteLocalAdministrators.execute(
      id,
      body.administrators.map(
        ({
          firstName,
          lastName,
          email,
          emailDomain,
          phone,
          jobTitle,
          campusId,
          avatarUrl,
        }) => ({
          firstName,
          lastName,
          email,
          emailDomain,
          phone,
          jobTitle,
          campusId: campusId ?? null,
          avatarUrl,
        }),
      ),
      this.getActor(request),
    );
  }

  @Post(':id/administrators/:administratorId/resend-invitation')
  resend(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('administratorId', new ParseUUIDPipe()) administratorId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.resendAdminInvitation.execute(
      id,
      administratorId,
      this.getActor(request),
    );
  }

  @Post('admin-profile-photos')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  uploadAdministratorPhoto(
    @UploadedFile() file: UploadedImageFile | undefined,
  ) {
    return this.photoStorage.save(file);
  }

  private toUniversityDraft(body: UniversityDto): UniversityDraft {
    return {
      accreditationCode: body.accreditationCode,
      name: body.name,
      acronym: body.acronym ?? null,
      province: body.province,
      city: body.city,
      website: body.website ?? null,
      domains: body.domains.map(({ domain, campusIndex }) => ({
        domain,
        campusIndex,
      })),
      campuses: body.campuses.map(
        ({ id, name, legalName, province, city, reference }) => ({
          ...(id ? { id } : {}),
          name,
          legalName: legalName ?? null,
          province,
          city,
          reference: reference ?? null,
        }),
      ),
    };
  }

  private getActor(request: AuthenticatedRequest): UniversityActor {
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
