import { IsIn } from 'class-validator';
import type { AcademicEntityStatus } from '../../domain/academic-structure-repository.js';

export class AcademicEntityStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: AcademicEntityStatus;
}
