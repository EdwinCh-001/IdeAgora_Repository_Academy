import { Transform } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

function trimStringArray(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;
}

export class SaveDirectorProfileDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(10, 3000)
  summary!: string;

  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  specializations!: string[];

  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @Length(1, 500, { each: true })
  academicDegrees!: string[];

  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @Length(1, 1000, { each: true })
  workExperience!: string[];

  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { each: true },
  )
  @Length(1, 2048, { each: true })
  externalLinks!: string[];
}
