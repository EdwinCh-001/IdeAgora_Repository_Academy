import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/auth/authenticated-request.js';
import { Roles } from '../../../common/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { CreateCareerUseCase } from '../application/create-career.use-case.js';
import { CreateFacultyUseCase } from '../application/create-faculty.use-case.js';
import { GetAcademicStructureUseCase } from '../application/get-academic-structure.use-case.js';
import { SetCareerStatusUseCase } from '../application/set-career-status.use-case.js';
import { SetFacultyStatusUseCase } from '../application/set-faculty-status.use-case.js';
import { UpdateCareerUseCase } from '../application/update-career.use-case.js';
import { UpdateFacultyUseCase } from '../application/update-faculty.use-case.js';
import type { AcademicStructureActor } from '../domain/academic-structure-repository.js';
import { AcademicEntityStatusDto } from './dto/academic-entity-status.dto.js';
import { CareerDto } from './dto/career.dto.js';
import { CreateFacultyDto, FacultyDto } from './dto/faculty.dto.js';

@Controller('academic-structure')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN_LOCAL')
export class AcademicStructureController {
  constructor(
    private readonly getAcademicStructure: GetAcademicStructureUseCase,
    private readonly createFaculty: CreateFacultyUseCase,
    private readonly updateFaculty: UpdateFacultyUseCase,
    private readonly setFacultyStatus: SetFacultyStatusUseCase,
    private readonly createCareer: CreateCareerUseCase,
    private readonly updateCareer: UpdateCareerUseCase,
    private readonly setCareerStatus: SetCareerStatusUseCase,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.getAcademicStructure.execute(this.getActor(request).id);
  }

  @Post('faculties')
  createFacultyRecord(
    @Body() body: CreateFacultyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createFaculty.execute(
      {
        name: body.name,
        acronym: body.acronym ?? null,
        campusId: body.campusId ?? null,
      },
      this.getActor(request),
    );
  }

  @Put('faculties/:id')
  updateFacultyRecord(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: FacultyDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updateFaculty.execute(
      id,
      { name: body.name, acronym: body.acronym ?? null },
      this.getActor(request),
    );
  }

  @Patch('faculties/:id/status')
  changeFacultyStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AcademicEntityStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.setFacultyStatus.execute(
      id,
      body.status,
      this.getActor(request),
    );
  }

  @Post('faculties/:facultyId/careers')
  createCareerRecord(
    @Param('facultyId', new ParseUUIDPipe()) facultyId: string,
    @Body() body: CareerDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.createCareer.execute(
      facultyId,
      { code: body.code, name: body.name },
      this.getActor(request),
    );
  }

  @Put('careers/:id')
  updateCareerRecord(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CareerDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updateCareer.execute(
      id,
      { code: body.code, name: body.name },
      this.getActor(request),
    );
  }

  @Patch('careers/:id/status')
  changeCareerStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AcademicEntityStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.setCareerStatus.execute(
      id,
      body.status,
      this.getActor(request),
    );
  }

  private getActor(request: AuthenticatedRequest): AcademicStructureActor {
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
