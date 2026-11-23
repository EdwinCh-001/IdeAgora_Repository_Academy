import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Length(64, 64)
  token!: string;
}

export class ResendVerificationEmailDto {
  @IsEmail()
  @Length(1, 254)
  email!: string;
}
