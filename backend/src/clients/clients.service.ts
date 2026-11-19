import { ConflictException, Injectable } from '@nestjs/common';
import { toCliente } from '../common/mappers';
import { digits, normalize, escapeLike } from '../common/text';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateClientDto } from './clients.dto';

/** Clientes del taller del usuario: nunca se ven ni se cruzan con los de otro taller. */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tallerId: number, q = '') {
    const term = normalize(q);
    const like = escapeLike(term); // comodines de LIKE como texto
    const qd = digits(q);
    const or: Prisma.ClienteWhereInput[] = [];
    if (term) {
      or.push({ nombreNormalizado: { contains: like } }, { email: { contains: like } });
      if (qd.length >= 3) or.push({ telefonoNormalizado: { contains: qd } });
    }
    const list = await this.prisma.cliente.findMany({
      where: { tallerId, ...(or.length ? { OR: or } : {}) },
      orderBy: { nombreNormalizado: 'asc' },
    });
    return list.map(toCliente);
  }

  async create(tallerId: number, dto: CreateClientDto) {
    const telefonoNormalizado = digits(dto.telefono);
    const dup = await this.prisma.cliente.findUnique({ where: { tallerId_telefonoNormalizado: { tallerId, telefonoNormalizado } } });
    if (dup) throw new ConflictException(`Ya existe un cliente con ese teléfono: ${dup.nombre}`);
    const c = await this.prisma.cliente.create({
      data: {
        tallerId,
        nombre: dto.nombre,
        nombreNormalizado: normalize(dto.nombre),
        telefono: dto.telefono,
        telefonoNormalizado,
        email: dto.email?.toLowerCase() || null,
        notas: dto.notas || null,
      },
    });
    return toCliente(c);
  }
}
