import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { trimString } from '../common/text';
import { CAUSAS_MANUALES } from '../domain/escalation';
import { MIN_COMENTARIO, MIN_MOTIVO, REOPEN_TARGETS } from '../domain/transitions';
import { MAX_BUSQUEDA } from '../domain/validation';
import {
  EstadoOrden, Impacto, Prioridad, ResolucionEscalamiento, Urgencia, type CausaEscalamiento,
} from '../generated/prisma/enums';

export class CreateOrderDto {
  @IsString() @IsNotEmpty({ message: 'Falta el cliente' })
  clienteId: string;

  @IsString() @IsNotEmpty({ message: 'Falta el equipo' })
  equipoId: string;

  @IsString() @IsNotEmpty({ message: 'Falta el servicio' })
  servicioId: string;

  @IsString() @IsNotEmpty({ message: 'Falta el responsable' })
  responsableId: string;

  @IsOptional() @IsString()
  tecnicoId?: string | null;

  @Transform(trimString)
  @IsString()
  @Length(MIN_MOTIVO, 1000, { message: `Describí la falla (entre ${MIN_MOTIVO} y 1000 caracteres)` })
  fallaReportada: string;

  @IsEnum(Impacto, { message: 'Elegí el impacto' })
  impacto: Impacto;

  @IsEnum(Urgencia, { message: 'Elegí la urgencia' })
  urgencia: Urgencia;

  @IsISO8601({}, { message: 'Fecha estimada inválida' })
  fechaEstimada: string;
}

export class UpdateOrderDto {
  @Transform(trimString) @IsOptional() @IsString() @MaxLength(2000)
  diagnostico?: string | null;

  @Transform(trimString) @IsOptional() @IsString() @MaxLength(2000)
  solucion?: string | null;

  @IsOptional() @IsString()
  tecnicoId?: string | null;

  @IsOptional() @IsString() @IsNotEmpty()
  responsableId?: string;

  @IsOptional() @IsEnum(Impacto)
  impacto?: Impacto;

  @IsOptional() @IsEnum(Urgencia)
  urgencia?: Urgencia;

  @Transform(trimString) @IsOptional() @IsString() @MaxLength(500)
  comentario?: string;
}

const comentarioMsg = `El comentario es obligatorio (mínimo ${MIN_COMENTARIO} caracteres)`;
const motivoMsg = `El motivo es obligatorio (mínimo ${MIN_MOTIVO} caracteres)`;

export class TransitionDto {
  @IsEnum(EstadoOrden, { message: 'Estado de destino inválido' })
  to: EstadoOrden;

  @Transform(trimString) @IsString({ message: comentarioMsg }) @Length(MIN_COMENTARIO, 500, { message: comentarioMsg })
  comentario: string;
}

export class CommentDto {
  @Transform(trimString) @IsString({ message: comentarioMsg }) @Length(MIN_COMENTARIO, 500, { message: comentarioMsg })
  comentario: string;
}

export class ReasonDto {
  @Transform(trimString) @IsString({ message: motivoMsg }) @Length(MIN_MOTIVO, 500, { message: motivoMsg })
  motivo: string;
}

export class ReopenDto extends ReasonDto {
  @IsIn(REOPEN_TARGETS, { message: 'Solo se puede reabrir a «En diagnóstico» o «En reparación»' })
  to: EstadoOrden;
}

export class EscalateDto extends ReasonDto {
  @IsIn(CAUSAS_MANUALES, { message: 'Elegí la causa del escalamiento' })
  causa: CausaEscalamiento;
}

export class ResolveEscalationDto {
  @IsEnum(ResolucionEscalamiento, { message: 'Elegí cómo se resuelve' })
  resolucion: ResolucionEscalamiento;

  /** Qué se resolvió; en «sin reparación», el informe para el cliente. */
  @Transform(trimString) @IsString({ message: motivoMsg }) @Length(MIN_MOTIVO, 1000, { message: `El detalle es obligatorio (mínimo ${MIN_MOTIVO} caracteres)` })
  texto: string;

  /** Reasignar el técnico (solo al continuar). */
  @IsOptional() @IsString()
  tecnicoId?: string;

  /** Constancia de aviso al cliente (obligatoria si se resuelve sin reparación). */
  @Transform(trimString) @IsOptional() @IsString() @MaxLength(500)
  avisoCliente?: string;
}

export class OrdersQuery {
  @IsOptional() @IsString() @MaxLength(MAX_BUSQUEDA, { message: `La búsqueda no puede tener más de ${MAX_BUSQUEDA} caracteres` })
  q?: string;

  @IsOptional() @IsEnum(EstadoOrden)
  status?: EstadoOrden;

  @IsOptional() @IsEnum(Prioridad)
  priority?: Prioridad;

  @IsOptional() @IsString() @MaxLength(50)
  ownerId?: string;
}
