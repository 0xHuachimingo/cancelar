import { z } from 'zod';
import { MIN_PASSWORD } from '@/lib/workflow/setup';
import { MAX_EMAIL, PRECIO_MAX, TIENE_LETRA_RE, problemaPassword, problemaTelefono } from '@/lib/workflow/validation';

/** Nombre propio (persona, cliente, taller, servicio): de 2 a `max` caracteres y con letras. */
export function nombre(campo: string, max: number) {
  return z
    .string()
    .trim()
    .min(2, `${campo}: mínimo 2 caracteres`)
    .max(max, `${campo}: máximo ${max} caracteres`)
    .regex(TIENE_LETRA_RE, `${campo}: tiene que tener letras`);
}

/** Teléfono obligatorio. */
export const telefono = z
  .string()
  .trim()
  .min(1, 'Ingresá el teléfono')
  .superRefine((v, ctx) => {
    const p = v === '' ? null : problemaTelefono(v);
    if (p) ctx.addIssue({ code: 'custom', message: p });
  });

/** Teléfono que se puede dejar vacío. */
export const telefonoOpcional = z
  .string()
  .trim()
  .superRefine((v, ctx) => {
    const p = v === '' ? null : problemaTelefono(v);
    if (p) ctx.addIssue({ code: 'custom', message: p });
  });

export const email = z.email('Ingresá un email válido').max(MAX_EMAIL, `Máximo ${MAX_EMAIL} caracteres`);

/** Contraseña nueva: largo mínimo, letras y números. */
export const passwordNueva = z.string().superRefine((v, ctx) => {
  const p = problemaPassword(v, MIN_PASSWORD);
  if (p) ctx.addIssue({ code: 'custom', message: p });
});

export const PASSWORD_HINT = `Mínimo ${MIN_PASSWORD} caracteres, con letras y números.`;

/** Precio escrito en un <input type="number">: entero de 0 a PRECIO_MAX. */
export const precio = z
  .string()
  .trim()
  .min(1, 'Ingresá el precio')
  .refine((v) => /^\d+$/.test(v), 'El precio es un número entero, sin puntos ni comas')
  .refine((v) => Number(v) <= PRECIO_MAX, `El precio no puede superar ${PRECIO_MAX.toLocaleString('es-AR')}`);
