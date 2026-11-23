import { IsEmail, Length } from 'class-validator';

export class RegistrationOptionsQueryDto {
  @IsEmail()
  @Length(1, 254)
  email!: string;
}
