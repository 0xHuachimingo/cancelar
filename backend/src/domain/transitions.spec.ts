import { calculatePriority } from './priority';
import { autoEscalation, canEscalate, canResolveEscalation, canTakeEscalation, sinReparacionMissing, type AutoEscalationInput } from './escalation';
import { canTransition, closeChecklist, type Actor, type WorkflowOrder } from './transitions';

const base: WorkflowOrder = {
  estado: 'RECIBIDO',
  tecnicoId: 'tec',
  responsableId: 'sup',
  bloqueada: false,
  escalada: false,
  resultado: null,
  informeNoReparacion: null,
  escalamientos: [],
  diagnostico: null,
  solucion: null,
  validada: false,
  evidencias: [],
};
const sup: Actor = { id: 'sup', roles: ['SUPERVISOR'] };
const tec: Actor = { id: 'tec', roles: ['TECNICO'] };
const otroTec: Actor = { id: 'otro', roles: ['TECNICO'] };
const recep: Actor = { id: 'rec', roles: ['RECEPCION'] };

describe('matriz de prioridad', () => {
  it.each([
    ['ALTO', 'ALTA', 'CRITICA'],
    ['ALTO', 'MEDIA', 'ALTA'],
    ['MEDIO', 'ALTA', 'ALTA'],
    ['BAJO', 'BAJA', 'BAJA'],
    ['ALTO', 'BAJA', 'MEDIA'],
    ['BAJO', 'ALTA', 'MEDIA'],
  ] as const)('%s + %s = %s', (i, u, p) => {
    expect(calculatePriority(i, u)).toBe(p);
  });
});

describe('transiciones', () => {
  it('exige técnico para pasar a diagnóstico', () => {
    expect(canTransition({ ...base, tecnicoId: null }, 'EN_DIAGNOSTICO', sup).missing).toEqual(['Falta asignar un técnico']);
  });

  it('no permite saltear estados', () => {
    const r = canTransition(base, 'PRUEBAS', sup);
    expect(r.ok).toBe(false);
    expect(r.missing[0]).toContain('El siguiente paso es «En diagnóstico»');
  });

  it('el técnico solo mueve sus órdenes', () => {
    expect(canTransition(base, 'EN_DIAGNOSTICO', tec).ok).toBe(true);
    expect(canTransition(base, 'EN_DIAGNOSTICO', otroTec).missing).toContain('Solo podés mover órdenes asignadas a vos');
  });

  it('recepción solo pasa de Recibido a Diagnóstico', () => {
    expect(canTransition(base, 'EN_DIAGNOSTICO', recep).ok).toBe(true);
    const enDiag = { ...base, estado: 'EN_DIAGNOSTICO' as const, diagnostico: 'x' };
    expect(canTransition(enDiag, 'EN_REPARACION', recep).ok).toBe(false);
  });

  it('una orden bloqueada no cambia de estado', () => {
    expect(canTransition({ ...base, bloqueada: true }, 'EN_DIAGNOSTICO', sup).missing).toContain(
      'La orden está bloqueada: primero hay que desbloquearla',
    );
  });

  it('el cierre exige solución, evidencia y validación', () => {
    const listo = { ...base, estado: 'LISTO_PARA_RETIRAR' as const };
    expect(canTransition(listo, 'CERRADO', sup).missing).toHaveLength(3);
    const completo = { ...listo, solucion: 'Reballing', evidencias: [{}], validada: true };
    expect(canTransition(completo, 'CERRADO', sup).ok).toBe(true);
    expect(canTransition(completo, 'CERRADO', tec).missing).toContain('Tu rol no puede cerrar la orden');
    expect(closeChecklist(completo).every((i) => i.done)).toBe(true);
  });
});

describe('escalamiento', () => {
  const admin: Actor = { id: 'adm', roles: ['ADMIN'] };
  const H = 3_600_000;
  const auto = (extra: Partial<AutoEscalationInput> = {}): AutoEscalationInput => ({
    estado: 'EN_REPARACION',
    prioridad: 'MEDIA',
    fechaIngresoMs: 0,
    fechaEstimadaMs: 1000 * H,
    bloqueadaDesdeMs: null,
    escalamientos: [],
    ...extra,
  });

  it('cada rol escala solo lo que le corresponde', () => {
    expect(canEscalate(base, tec, 'TECNICA').ok).toBe(true);
    expect(canEscalate(base, otroTec, 'TECNICA').ok).toBe(false);
    expect(canEscalate(base, recep, 'TECNICA').ok).toBe(false);
    expect(canEscalate(base, recep, 'RECLAMO_CLIENTE').ok).toBe(true);
    expect(canEscalate(base, sup, 'TECNICA').ok).toBe(true);
    expect(canEscalate(base, admin, 'TECNICA').ok).toBe(false);
  });

  it('el nivel 3 no lo atiende el Supervisor', () => {
    const n3 = { ...base, escalamientos: [{ estado: 'ABIERTO' as const, nivel: 3 }] };
    expect(canTakeEscalation(n3, sup).ok).toBe(false);
    expect(canTakeEscalation(n3, admin).ok).toBe(true);
    expect(canResolveEscalation(n3, admin).missing).toEqual(['Primero hay que tomar el escalamiento']);
  });

  it('sin reparación pide todo lo que respalda la decisión', () => {
    expect(sinReparacionMissing(base, 'corto', '')).toHaveLength(4);
    expect(sinReparacionMissing({ diagnostico: 'Placa', evidencias: [1] }, 'x'.repeat(20), 'Llamó Ana')).toEqual([]);
  });

  it('plazos automáticos', () => {
    expect(autoEscalation(auto({ prioridad: 'CRITICA' }), 23 * H)).toBeNull();
    expect(autoEscalation(auto({ prioridad: 'CRITICA' }), 25 * H)).toMatchObject({ accion: 'crear', nivel: 2, causa: 'CRITICA_24H' });
    expect(autoEscalation(auto({ prioridad: 'CRITICA' }), 49 * H)).toMatchObject({ accion: 'crear', nivel: 3 });
    expect(autoEscalation(auto({ fechaEstimadaMs: 0 }), 25 * H)).toMatchObject({ causa: 'PLAZO' });
    expect(autoEscalation(auto({ bloqueadaDesdeMs: 0 }), 47 * H)).toBeNull();
    expect(autoEscalation(auto({ bloqueadaDesdeMs: 0 }), 49 * H)).toMatchObject({ causa: 'BLOQUEO_PROLONGADO' });
    expect(autoEscalation(auto({ prioridad: 'CRITICA', estado: 'LISTO_PARA_RETIRAR' }), 100 * H)).toBeNull();
  });

  it('lo resuelto no se repite hasta que pasa su plazo', () => {
    const resuelto = { estado: 'RESUELTO' as const, nivel: 2, causa: 'PLAZO' as const, creadoEnMs: 0, resueltoEnMs: 30 * H };
    const o = auto({ fechaEstimadaMs: 0, escalamientos: [resuelto] });
    expect(autoEscalation(o, 40 * H)).toBeNull();
    expect(autoEscalation(o, 55 * H)).toMatchObject({ causa: 'PLAZO' });
  });

  it('sube de nivel si nadie lo toma, pero no si está tomado', () => {
    const abierto = { estado: 'ABIERTO' as const, nivel: 2, causa: 'TECNICA' as const, creadoEnMs: 0, resueltoEnMs: null };
    expect(autoEscalation(auto({ escalamientos: [abierto] }), 25 * H)).toMatchObject({ accion: 'subir' });
    expect(autoEscalation(auto({ escalamientos: [{ ...abierto, estado: 'TOMADO' }] }), 25 * H)).toBeNull();
  });
});
