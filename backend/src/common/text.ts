/** minúsculas, sin tildes y sin espacios sobrantes (para búsqueda). */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function digits(s: string): string {
  return s.replace(/\D/g, '');
}

/** Transformador para DTOs: recorta strings, deja intacto el resto. */
export function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Para usar un texto en `contains` / `startsWith` de Prisma: Prisma arma un LIKE sin escapar
 * los comodines, así que «%» o «_» encontrarían cualquier cosa.
 */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
