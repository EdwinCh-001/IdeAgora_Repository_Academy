import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

export class LocalAdministratorDto {
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @IsEmail()
  @Length(1, 254)
  email!: string;

  @IsString()
  @Length(1, 255)
  @Matches(/^@?(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i, {
    message: 'Ingresa un dominio institucional válido.',
  })
  emailDomain!: string;

  @IsString()
  @Length(1, 20)
  phone!: string;

  @IsString()
  @Length(1, 120)
  jobTitle!: string;

  @IsOptional()
  @IsUUID()
  campusId?: string | null;

  @IsString()
  @Matches(
    /^\/public\/admin-profile-photos\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/i,
    { message: 'Carga una fotografía de perfil válida.' },
  )
  avatarUrl!: string;
}

export class InviteLocalAdministratorsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LocalAdministratorDto)
  administrators!: LocalAdministratorDto[];
}
