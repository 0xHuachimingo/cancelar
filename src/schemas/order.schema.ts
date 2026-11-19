import { z } from 'zod';
import { now } from '@/lib/clock';
import { MIN_MOTIVO } from '@/lib/workflow/transitions';
import { MAX_DIAS_ESTIMADA } from '@/lib/workflow/validation';
import { NIVELES_IMPACTO, NIVELES_URGENCIA } from '@/types/domain';

/** AAAA-MM-DD en hora local (lo que devuelve <input type="date">). */
export function localDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Último día aceptado como fecha estimada (AAAA-MM-DD). */
export function maxFechaEstimada(): string {
  const d = new Date(now());
  d.setDate(d.getDate() + MAX_DIAS_ESTIMADA);
  return localDate(d.getTime());
}

export const orderSchema = z.object({
  clienteId: z.string().min(1, 'Elegí o creá un cliente'),
  equipoId: z.string().min(1, 'Elegí o creá un equipo'),
  servicioId: z.string().min(1, 'Elegí un servicio'),
  responsableId: z.string().min(1, 'Asigná un responsable'),
  tecnicoId: z.string(),
  fallaReportada: z
    .string()
    .trim()
    .min(MIN_MOTIVO, `Describí la falla (mínimo ${MIN_MOTIVO} caracteres)`)
    .max(1000, 'Máximo 1000 caracteres'),
  impacto: z.enum(NIVELES_IMPACTO, 'Elegí el impacto'),
  urgencia: z.enum(NIVELES_URGENCIA, 'Elegí la urgencia'),
  fechaEstimada: z
    .string()
    .min(1, 'Elegí la fecha estimada de entrega')
    .refine((v) => v >= localDate(now()), 'La fecha estimada no puede ser anterior a hoy')
    .refine((v) => v <= maxFechaEstimada(), `Como máximo ${MAX_DIAS_ESTIMADA} días después de hoy`),
});

export type OrderInput = z.infer<typeof orderSchema>;
