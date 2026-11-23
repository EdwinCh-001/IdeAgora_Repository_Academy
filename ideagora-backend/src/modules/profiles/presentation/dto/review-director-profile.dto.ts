import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import type { DirectorProfileReviewDecision } from '../../domain/director-profile-repository.js';

export class ReviewDirectorProfileDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: DirectorProfileReviewDecision;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 500)
  reason?: string;
}
