import { IsString, Length, Matches } from 'class-validator';

export class AcceptAdminInvitationDto {
  @IsString()
  @Length(64, 64)
  token!: string;

  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{10,72}$/,
    {
      message:
        'La contraseña debe tener entre 10 y 72 caracteres, mayúscula, minúscula y número.',
    },
  )
  password!: string;
}
