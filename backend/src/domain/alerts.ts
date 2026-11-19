import type { EstadoOrden, Prioridad } from '../generated/prisma/enums';

export const CRITICAL_THRESHOLD_HOURS = 24;

interface Timed {
  estado: EstadoOrden;
  prioridad: Prioridad;
  fechaIngreso: Date;
  fechaEstimada: Date;
  fechaCierre: Date | null;
}

export function hoursOpen(order: Pick<Timed, 'fechaIngreso' | 'fechaCierre'>, nowMs: number): number {
  const end = order.fechaCierre ? order.fechaCierre.getTime() : nowMs;
  return Math.max(0, (end - order.fechaIngreso.getTime()) / 3_600_000);
}

export function isOpen(order: Pick<Timed, 'estado'>): boolean {
  return order.estado !== 'CERRADO';
}

/** Pasó la fecha estimada y todavía no está lista para retirar. */
export function isOverdue(order: Pick<Timed, 'estado' | 'fechaEstimada'>, nowMs: number): boolean {
  if (order.estado === 'CERRADO' || order.estado === 'LISTO_PARA_RETIRAR') return false;
  return nowMs > order.fechaEstimada.getTime();
}

/** Crítica y abierta hace más de 24 h. */
export function isCriticalOverdue(order: Timed, nowMs: number): boolean {
  return order.prioridad === 'CRITICA' && isOpen(order) && hoursOpen(order, nowMs) > CRITICAL_THRESHOLD_HOURS;
}
