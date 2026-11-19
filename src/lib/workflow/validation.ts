/**
 * Reglas de los datos que se cargan a mano. Copia fiel de backend/src/domain/validation.ts.
 */

/** Teléfono: solo números, espacios, +, - y paréntesis; entre 6 y 15 dígitos (máximo internacional). */
export const TELEFONO_RE = /^[+\d\s()-]+$/;
export const TEL_MIN_DIGITOS = 6;
export const TEL_MAX_DIGITOS = 15;
export const TEL_MAX_LARGO = 30;

/** Nombres de personas, clientes, talleres y servicios: al menos una letra (no «123» ni «!!»). */
export const TIENE_LETRA_RE = /\p{L}/u;

/** Contraseñas: largo mínimo (MIN_PASSWORD en setup.ts) con al menos una letra y un número. */
export const TIENE_NUMERO_RE = /\d/;
export const MAX_PASSWORD = 200;

/** Largo máximo de un email (RFC 5321). */
export const MAX_EMAIL = 254;

/** Precio de un servicio, en pesos enteros. */
export const PRECIO_MAX = 100_000_000;

/** La fecha estimada de entrega va de hoy hasta un año adelante. */
export const MAX_DIAS_ESTIMADA = 365;

/** Texto de búsqueda. */
export const MAX_BUSQUEDA = 100;

export function digitosTelefono(telefono: string): number {
  return telefono.replace(/\D/g, '').length;
}

/** Problemas de un teléfono, en el orden en que conviene mostrarlos (vacío si está bien). */
export function problemaTelefono(telefono: string): string | null {
  if (!TELEFONO_RE.test(telefono)) return 'Teléfono: usá solo números, espacios, +, - o paréntesis';
  const n = digitosTelefono(telefono);
  if (n < TEL_MIN_DIGITOS) return `El teléfono debe tener al menos ${TEL_MIN_DIGITOS} dígitos`;
  if (n > TEL_MAX_DIGITOS || telefono.length > TEL_MAX_LARGO) return `El teléfono no puede tener más de ${TEL_MAX_DIGITOS} dígitos`;
  return null;
}

/** Problema de una contraseña nueva (null si está bien). */
export function problemaPassword(password: string, minimo: number): string | null {
  if (password.length < minimo) return `La contraseña debe tener al menos ${minimo} caracteres`;
  if (password.length > MAX_PASSWORD) return `La contraseña no puede tener más de ${MAX_PASSWORD} caracteres`;
  if (!TIENE_LETRA_RE.test(password) || !TIENE_NUMERO_RE.test(password)) return 'La contraseña tiene que combinar letras y números';
  return null;
}

/** Último día (incluido) aceptado como fecha estimada, contando desde el inicio de hoy. */
export function limiteFechaEstimada(inicioHoyMs: number): number {
  return inicioHoyMs + (MAX_DIAS_ESTIMADA + 1) * 86_400_000;
}
