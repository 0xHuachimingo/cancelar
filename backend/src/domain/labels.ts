import type { EstadoOrden, ResolucionEscalamiento, Rol } from '../generated/prisma/enums';

export const ESTADO_LABEL: Record<EstadoOrden, string> = {
  RECIBIDO: 'Recibido',
  EN_DIAGNOSTICO: 'En diagnóstico',
  EN_REPARACION: 'En reparación',
  PRUEBAS: 'Pruebas',
  LISTO_PARA_RETIRAR: 'Listo para retirar',
  CERRADO: 'Cerrado',
};

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  RECEPCION: 'Recepción',
  TECNICO: 'Técnico',
};

export const RESOLUCION_LABEL: Record<ResolucionEscalamiento, string> = {
  CONTINUAR: 'Continuar',
  EN_ESPERA: 'En espera',
  NO_REPARABLE: 'No reparable',
  RECHAZADO_CLIENTE: 'Rechazado por el cliente',
};
