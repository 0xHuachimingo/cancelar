import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { toEquipo } from '../common/mappers';
import { normalize, escapeLike } from '../common/text';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEquipmentDto, EquipmentQuery } from './equipment.dto';

/** Equipos del taller del usuario. */
@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tallerId: number, query: EquipmentQuery) {
    const term = normalize(query.q ?? '');
    const like = escapeLike(term); // comodines de LIKE como texto
    const where: Prisma.EquipoWhereInput = {
      tallerId,
      ...(query.clientId ? { clienteId: query.clientId } : {}),
      ...(term
        ? { OR: [{ busqueda: { contains: like } }, { cliente: { nombreNormalizado: { contains: like } } }] }
        : {}),
    };
    const list = await this.prisma.equipo.findMany({ where, orderBy: { creadoEn: 'desc' } });
    return list.map(toEquipo);
  }

  async create(tallerId: number, dto: CreateEquipmentDto) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: dto.clienteId, tallerId } });
    if (!cliente) throw new BadRequestException('El cliente no existe');
    const dup = await this.prisma.equipo.findUnique({ where: { tallerId_numeroSerie: { tallerId, numeroSerie: dto.numeroSerie } } });
    if (dup) throw new ConflictException(`Ya existe un equipo con el número de serie ${dto.numeroSerie}`);
    const e = await this.prisma.equipo.create({
      data: {
        tallerId,
        clienteId: dto.clienteId,
        tipo: dto.tipo,
        marca: dto.marca,
        modelo: dto.modelo,
        numeroSerie: dto.numeroSerie,
        busqueda: normalize(`${dto.marca} ${dto.modelo} ${dto.numeroSerie}`),
        notas: dto.notas || null,
      },
    });
    return toEquipo(e);
  }
}
