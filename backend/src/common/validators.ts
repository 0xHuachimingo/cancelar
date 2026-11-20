import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail, IsOptional, IsString, Length, Matches, MaxLength, Validate, ValidatorConstraint,
  type ValidationArguments, type ValidatorConstraintInterface,
} from 'class-validator';
import { MIN_PASSWORD } from '../domain/setup';
import { MAX_EMAIL, TIENE_LETRA_RE, problemaPassword, problemaTelefono } from '../domain/validation';
import { trimString } from './text';

@ValidatorConstraint({ name: 'telefono' })
class TelefonoValido implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && problemaTelefono(value) === null;
  }
  defaultMessage(args: ValidationArguments): string {
    return typeof args.value === 'string' ? (problemaTelefono(args.value) ?? '') : 'Ingresá el teléfono';
  }
}

@ValidatorConstraint({ name: 'password' })
class PasswordValida implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && problemaPassword(value, MIN_PASSWORD) === null;
  }
  defaultMessage(args: ValidationArguments): string {
    return typeof args.value === 'string' ? (problemaPassword(args.value, MIN_PASSWORD) ?? '') : 'Ingresá la contraseña';
  }
}

const vacioANull = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : trimString({ value }));
const minusculas = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Nombre propio (persona, cliente, taller, servicio): recortado, con largo acotado y al menos una letra. */
export function Nombre(campo: string, max: number, opcional = false) {
  const msg = `${campo}: entre 2 y ${max} caracteres`;
  return applyDecorators(
    Transform(trimString),
    ...(opcional ? [IsOptional()] : []),
    IsString({ message: msg }),
    Length(2, max, { message: msg }),
    Matches(TIENE_LETRA_RE, { message: `${campo}: tiene que tener letras` }),
  );
}

/** Teléfono obligatorio. */
export function Telefono() {
  return applyDecorators(Transform(trimString), IsString({ message: 'Ingresá el teléfono' }), Validate(TelefonoValido));
}

/** Teléfono opcional: vacío se guarda como null. */
export function TelefonoOpcional() {
  return applyDecorators(Transform(vacioANull), IsOptional(), IsString(), Validate(TelefonoValido));
}

/** Email obligatorio, en minúsculas. */
export function Email() {
  return applyDecorators(
    Transform(minusculas),
    IsEmail({}, { message: 'Ingresá un email válido' }),
    MaxLength(MAX_EMAIL, { message: `El email no puede tener más de ${MAX_EMAIL} caracteres` }),
  );
}

/** Email opcional: vacío se guarda como null. */
export function EmailOpcional() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : minusculas({ value }))),
    IsOptional(),
    IsEmail({}, { message: 'Email inválido' }),
    MaxLength(MAX_EMAIL, { message: `El email no puede tener más de ${MAX_EMAIL} caracteres` }),
  );
}

/** Contraseña nueva: largo mínimo, letras y números. */
export function PasswordNueva(opcional = false) {
  return applyDecorators(...(opcional ? [IsOptional()] : []), Validate(PasswordValida));
}
