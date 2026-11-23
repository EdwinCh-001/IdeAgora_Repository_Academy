import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CampusDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  legalName?: string | null;

  @IsString()
  @Length(1, 100)
  province!: string;

  @IsString()
  @Length(1, 100)
  city!: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  reference?: string | null;
}

export class UniversityDomainDto {
  @IsString()
  @Length(1, 255)
  @Matches(/^@?(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i, {
    message: 'Ingresa un dominio válido, por ejemplo @universidad.edu.ec.',
  })
  domain!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  campusIndex?: number;
}

export class UniversityDto {
  @IsString()
  @Length(1, 100)
  accreditationCode!: string;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  acronym?: string | null;

  @IsString()
  @Length(1, 100)
  province!: string;

  @IsString()
  @Length(1, 100)
  city!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @Length(1, 255)
  website?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => UniversityDomainDto)
  domains!: UniversityDomainDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CampusDto)
  campuses: CampusDto[] = [];
}
