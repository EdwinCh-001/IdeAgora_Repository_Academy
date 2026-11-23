import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class CareerDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 30)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/)
  code!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 120)
  name!: string;
}
