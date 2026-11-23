import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export class SuspendUserDto {
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

  @IsBoolean()
  permanent!: boolean;

  @ValidateIf((input: SuspendUserDto) => !input.permanent)
  @IsDateString()
  endsAt?: string | null;
}
