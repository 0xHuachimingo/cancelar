import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { trimString } from '../../common/text';

export class LoginDto {
  @Transform(trimString)
  @IsEmail({}, { message: 'Ingresá un email válido' })
  @MaxLength(254, { message: 'Ingresá un email válido' })
  email: string;

  @IsString({ message: 'Ingresá la contraseña' })
  @MinLength(1, { message: 'Ingresá la contraseña' })
  @MaxLength(200)
  password: string;
}
