/**
 * Configuración inicial del taller. Copia fiel de frontend/src/lib/workflow/setup.ts.
 * Admin no figura: quien crea la cuenta ya lo es.
 */
import type { Rol } from '../generated/prisma/enums';

export const ROLES_ESENCIALES: readonly Rol[] = ['SUPERVISOR', 'RECEPCION', 'TECNICO'];
export const MIN_PASSWORD = 8;
/** Talleres que puede alojar esta instalación. */
export const MAX_TALLERES = 5;

/** Roles esenciales que nadie activo cubre. Una persona puede cubrir varios. */
export function rolesFaltantes(usuarios: readonly { roles: readonly Rol[]; activo: boolean }[]): Rol[] {
  const cubiertos = new Set(usuarios.filter((u) => u.activo).flatMap((u) => u.roles));
  return ROLES_ESENCIALES.filter((r) => !cubiertos.has(r));
}
