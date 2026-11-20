import { z } from 'zod';
import { email, nombre, passwordNueva } from './common';

export const loginSchema = z.object({
  email: z.email('Ingresá un email válido'),
  password: z.string().min(1, 'Ingresá la contraseña'),
});

export type LoginInput = z.infer<typeof loginSchema>;

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
