import type { Impacto, Prioridad, Urgencia } from '../generated/prisma/enums';

/** Matriz impacto × urgencia (idéntica a frontend/src/lib/workflow/priority.ts). */
export const PRIORITY_MATRIX: Readonly<Record<Impacto, Readonly<Record<Urgencia, Prioridad>>>> = {
  ALTO: { BAJA: 'MEDIA', MEDIA: 'ALTA', ALTA: 'CRITICA' },
  MEDIO: { BAJA: 'MEDIA', MEDIA: 'MEDIA', ALTA: 'ALTA' },
  BAJO: { BAJA: 'BAJA', MEDIA: 'MEDIA', ALTA: 'MEDIA' },
};

export function calculatePriority(impacto: Impacto, urgencia: Urgencia): Prioridad {
  return PRIORITY_MATRIX[impacto][urgencia];
}
