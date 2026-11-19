import { z } from 'zod';
import { ROLES } from '@/types/domain';
import { email, nombre, passwordNueva } from './common';

/** Demo: email + contraseña visuales y rol de prueba. */
export const loginSchema = z.object({
  email: z.email('Ingresá un email válido'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
  rol: z.enum(ROLES, 'Elegí un rol de prueba'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Backend real: email + contraseña. */
export const realLoginSchema = z.object({
  email: z.email('Ingresá un email válido'),
  password: z.string().min(1, 'Ingresá la contraseña'),
});

export type RealLoginInput = z.infer<typeof realLoginSchema>;

const repetida = 'Las contraseñas no coinciden';

export const registerSchema = z
  .object({
    tallerNombre: nombre('Nombre del taller', 100),
    nombre: nombre('Tu nombre', 100),
    email,
    password: passwordNueva,
    confirmar: z.string().min(1, 'Repetí la contraseña'),
  })
  .refine((d) => d.confirmar === d.password, { path: ['confirmar'], message: repetida });

export type RegisterInput = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    actual: z.string().min(1, 'Ingresá tu contraseña actual'),
    nueva: passwordNueva,
    confirmar: z.string().min(1, 'Repetí la contraseña nueva'),
  })
  .refine((d) => d.nueva !== d.actual, { path: ['nueva'], message: 'Tiene que ser distinta de la actual' })
  .refine((d) => d.confirmar === d.nueva, { path: ['confirmar'], message: repetida });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
