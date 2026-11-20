/**
 * Reglas del workflow. Funciones puras, idénticas a frontend/src/lib/workflow/transitions.ts
 * (la UI las usa para explicar qué falta; el backend, para rechazar con 422).
 */
import type { EstadoEscalamiento, EstadoOrden, ResultadoOrden, Rol } from '../generated/prisma/enums';
import { ESTADO_LABEL } from './labels';
import { can } from './permissions';

export const MIN_COMENTARIO = 5;
export const MIN_MOTIVO = 10;

export const NEXT_STATE: Partial<Record<EstadoOrden, EstadoOrden>> = {
  RECIBIDO: 'EN_DIAGNOSTICO',
  EN_DIAGNOSTICO: 'EN_REPARACION',
  EN_REPARACION: 'PRUEBAS',
  PRUEBAS: 'LISTO_PARA_RETIRAR',
  LISTO_PARA_RETIRAR: 'CERRADO',
};

export const ALLOWED_TRANSITIONS: Readonly<Record<EstadoOrden, readonly EstadoOrden[]>> = {
  RECIBIDO: ['EN_DIAGNOSTICO'],
  EN_DIAGNOSTICO: ['EN_REPARACION'],
  EN_REPARACION: ['PRUEBAS', 'EN_DIAGNOSTICO'],
  PRUEBAS: ['LISTO_PARA_RETIRAR', 'EN_REPARACION'],
  LISTO_PARA_RETIRAR: ['CERRADO', 'PRUEBAS'],
  CERRADO: [],
};

export const REOPEN_TARGETS: readonly EstadoOrden[] = ['EN_DIAGNOSTICO', 'EN_REPARACION'];

/** Lo mínimo que las reglas necesitan saber de una orden. */
export interface WorkflowOrder {
  estado: EstadoOrden;
  tecnicoId: string | null;
  responsableId: string;
  bloqueada: boolean;
  escalada: boolean;
  diagnostico: string | null;
  solucion: string | null;
  validada: boolean;
  evidencias: readonly unknown[];
  resultado: ResultadoOrden | null;
  informeNoReparacion: string | null;
  escalamientos: readonly { estado: EstadoEscalamiento; nivel: number }[];
}

export interface Actor {
  id: string;
  roles: readonly Rol[];
}

export interface RuleResult {
  ok: boolean;
  missing: string[];
}

const result = (missing: string[]): RuleResult => ({ ok: missing.length === 0, missing });

export function isAssignedTo(order: Pick<WorkflowOrder, 'tecnicoId' | 'responsableId'>, user: Actor): boolean {
  return order.tecnicoId === user.id || order.responsableId === user.id;
}

export type OrderAction = 'transition' | 'block' | 'escalate' | 'edit';

export function canActOnOrder(user: Actor, order: WorkflowOrder, action: OrderAction): boolean {
  if (can(user.roles, `order.${action}`)) return true;
  return can(user.roles, `order.${action}.own`) && isAssignedTo(order, user);
}

/** La orden se resolvió sin reparar (no reparable o rechazada por el cliente). */
export function isSinReparar(order: Pick<WorkflowOrder, 'resultado'>): boolean {
  return order.resultado === 'NO_REPARABLE' || order.resultado === 'RECHAZADO_CLIENTE';
}

const hasOpenEscalation = (order: WorkflowOrder) => order.escalamientos.some((e) => e.estado !== 'RESUELTO');

export interface ChecklistItem {
  id: 'solucion' | 'informe' | 'evidencia' | 'validada';
  label: string;
  done: boolean;
  missingText: string;
}

export function closeChecklist(order: WorkflowOrder): ChecklistItem[] {
  return [
    isSinReparar(order)
      ? { id: 'informe', label: 'Informe de no reparación', done: Boolean(order.informeNoReparacion?.trim()), missingText: 'Falta el informe de no reparación' }
      : { id: 'solucion', label: 'Solución documentada', done: Boolean(order.solucion?.trim()), missingText: 'Falta documentar la solución' },
    { id: 'evidencia', label: 'Al menos una evidencia adjunta', done: order.evidencias.length > 0, missingText: 'Falta adjuntar al menos una evidencia' },
    { id: 'validada', label: 'Validación visual de un supervisor', done: order.validada, missingText: 'Falta la validación visual de un supervisor' },
  ];
}

function transitionPermission(order: WorkflowOrder, to: EstadoOrden, user: Actor): string | null {
  if (to === 'CERRADO') {
    return can(user.roles, 'order.close') || can(user.roles, 'order.deliver') ? null : 'Tu rol no puede cerrar la orden';
  }
  if (can(user.roles, 'order.transition')) return null;
  const own = can(user.roles, 'order.transition.own');
  const reception = can(user.roles, 'order.transition.reception');
  if (own && isAssignedTo(order, user)) return null;
  if (reception && order.estado === 'RECIBIDO' && to === 'EN_DIAGNOSTICO') return null;
  if (own) return 'Solo podés mover órdenes asignadas a vos';
  if (reception) return 'Recepción solo puede pasar órdenes de Recibido a En diagnóstico';
  return 'Tu rol no puede cambiar el estado de las órdenes';
}

export function canTransition(order: WorkflowOrder, to: EstadoOrden, user: Actor): RuleResult {
  if (order.estado === to) return result([`La orden ya está en «${ESTADO_LABEL[to]}»`]);
  if (order.estado === 'CERRADO') return result(['La orden está cerrada: usá «Reabrir» para volver a trabajarla']);

  if (!ALLOWED_TRANSITIONS[order.estado].includes(to)) {
    const next = NEXT_STATE[order.estado];
    return result([
      `No se puede pasar de «${ESTADO_LABEL[order.estado]}» a «${ESTADO_LABEL[to]}»` +
        (next ? `. El siguiente paso es «${ESTADO_LABEL[next]}»` : ''),
    ]);
  }

  const missing: string[] = [];
  const perm = transitionPermission(order, to, user);
  if (perm) missing.push(perm);
  if (order.bloqueada) missing.push('La orden está bloqueada: primero hay que desbloquearla');
  if (isSinReparar(order) && to !== 'CERRADO') missing.push('La orden se resolvió sin reparación: solo queda entregarla');

  switch (to) {
    case 'EN_DIAGNOSTICO':
      if (!order.tecnicoId) missing.push('Falta asignar un técnico');
      break;
    case 'EN_REPARACION':
      if (!order.diagnostico?.trim() && order.estado === 'EN_DIAGNOSTICO') missing.push('Falta cargar el diagnóstico');
      break;
    case 'LISTO_PARA_RETIRAR':
      if (!order.solucion?.trim()) missing.push('Falta documentar la solución');
      break;
    case 'CERRADO':
      for (const item of closeChecklist(order)) if (!item.done) missing.push(item.missingText);
      if (hasOpenEscalation(order)) missing.push('Hay un escalamiento abierto: primero hay que resolverlo');
      break;
    default:
      break;
  }
  return result(missing);
}

export function canBlock(order: WorkflowOrder, user: Actor): RuleResult {
  const missing: string[] = [];
  if (order.estado === 'CERRADO') missing.push('No se puede bloquear una orden cerrada');
  if (order.bloqueada) missing.push('La orden ya está bloqueada');
  if (!canActOnOrder(user, order, 'block')) missing.push('No tenés permiso para bloquear esta orden');
  return result(missing);
}

export function canUnblock(order: WorkflowOrder, user: Actor): RuleResult {
  const missing: string[] = [];
  if (!order.bloqueada) missing.push('La orden no está bloqueada');
  if (!can(user.roles, 'order.unblock')) missing.push('Solo un Supervisor o Admin puede desbloquear');
  return result(missing);
}

export function canReopen(order: WorkflowOrder, user: Actor): RuleResult {
  const missing: string[] = [];
  if (order.estado !== 'CERRADO') missing.push('Solo se pueden reabrir órdenes cerradas');
  if (!can(user.roles, 'order.reopen')) missing.push('Solo un Supervisor o Admin puede reabrir');
  return result(missing);
}

export function canValidate(order: WorkflowOrder, user: Actor): RuleResult {
  const missing: string[] = [];
  if (!can(user.roles, 'order.validate')) missing.push('Solo un Supervisor o Admin puede validar');
  if (order.estado === 'CERRADO') missing.push('La orden ya está cerrada');
  if (!order.solucion?.trim() && !order.informeNoReparacion?.trim()) missing.push('Primero hay que documentar la solución');
  return result(missing);
}
