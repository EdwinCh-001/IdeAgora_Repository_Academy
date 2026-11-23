import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class RegisterUserDto {
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
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{10,72}$/,
    {
      message:
        'La contraseña debe tener entre 10 y 72 caracteres, mayúscula, minúscula y número.',
    },
  )
  password!: string;

  @IsUUID()
  facultyId!: string;

  @IsUUID()
  careerId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  interestIds: string[] = [];
}
