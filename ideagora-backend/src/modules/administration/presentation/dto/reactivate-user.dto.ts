import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class ReactivateUserDto {
  @IsString()
  @Length(1, 200)
  confirmationName!: string;

  @IsString()
  @Length(1, 72)
  password!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 1000)
  reason!: string;
}
