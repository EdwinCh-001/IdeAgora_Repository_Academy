import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/auth/authenticated-request.js';
import { Roles } from '../../../common/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import type { UserManagementActor } from '../domain/user-management-repository.js';
import { ListManagedUsersUseCase } from '../application/list-managed-users.use-case.js';
import { ReactivateUserUseCase } from '../application/reactivate-user.use-case.js';
import { SuspendUserUseCase } from '../application/suspend-user.use-case.js';
import { ReactivateUserDto } from './dto/reactivate-user.dto.js';
import { SuspendUserDto } from './dto/suspend-user.dto.js';

@Controller('administration/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN_GLOBAL', 'ADMIN_LOCAL')
export class UserManagementController {
  constructor(
    private readonly listManagedUsers: ListManagedUsersUseCase,
    private readonly suspendUser: SuspendUserUseCase,
    private readonly reactivateUser: ReactivateUserUseCase,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.listManagedUsers.execute(this.getActor(request));
  }

  @Post(':id/suspension')
  suspend(
    @Param('id', new ParseUUIDPipe()) targetId: string,
    @Body() body: SuspendUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.suspendUser.execute(targetId, body, this.getActor(request));
  }

  @Post(':id/reactivation')
  reactivate(
    @Param('id', new ParseUUIDPipe()) targetId: string,
    @Body() body: ReactivateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reactivateUser.execute(targetId, body, this.getActor(request));
  }

  private getActor(request: AuthenticatedRequest): UserManagementActor {
    if (!request.user) {
      throw new UnauthorizedException('Inicia sesión para continuar.');
    }
    return {
      id: request.user.id,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      role: request.user.role,
      ipAddress: request.ip ?? null,
    };
  }
}
