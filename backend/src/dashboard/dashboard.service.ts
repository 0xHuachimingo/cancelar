import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { AuthUser } from '../auth/auth.decorators';
import { ORDER_INCLUDE, toOrdenResumen, type OrdenFull, type OrdenResumenDto } from '../common/mappers';
import { hoursOpen, isCriticalOverdue, isOpen } from '../domain/alerts';
import { Prisma, type InformeCritico } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { SetupService } from '../setup/setup.service';

const lastComment = (o: OrdenFull): string | null => o.historial.at(-1)?.comentario ?? null;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger('InformesCriticos');

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly setup: SetupService,
  ) {}

  /**
   * Genera/actualiza un InformeCritico por cada orden crítica abierta > 24 h
   * (uno por cada día completo que siga abierta) y actualiza horas y último comentario. Corre cada
   * 10 minutos. El dashboard además crea al instante los que falten (ver currentReports).
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncCriticalReports(): Promise<number> {
    const now = Date.now();
    const candidates = await this.prisma.orden.findMany({
      where: { prioridad: 'CRITICA', estado: { not: 'CERRADO' } },
      include: ORDER_INCLUDE,
    });
    let count = 0;
    for (const o of candidates) {
      if (!isCriticalOverdue(o, now)) continue;
      const horas = hoursOpen(o, now);
      const dia = Math.floor(horas / 24);
      await this.prisma.informeCritico.upsert({
        where: { ordenId_dia: { ordenId: o.id, dia } },
        create: { ordenId: o.id, dia, horasAbierta: horas, responsableId: o.responsableId, ultimoComentario: lastComment(o) },
        update: { horasAbierta: horas, ultimoComentario: lastComment(o), responsableId: o.responsableId },
      });
      count++;
    }
    if (count) this.logger.log(`${count} orden(es) crítica(s) abiertas más de 24 h`);
    return count;
  }

  /**
   * Devuelve el informe del día vigente de cada orden crítica vencida, creando solo los que faltan.
   * No reescribe los existentes (eso lo hace la tarea programada): así abrir el dashboard no genera
   * escrituras en cada request, y dos usuarios a la vez no chocan al crear el mismo informe.
   */
  private async currentReports(vencidas: OrdenResumenDto[]): Promise<Map<string, InformeCritico>> {
    const wanted = vencidas.map((o) => ({ o, dia: Math.floor(o.horasAbierta / 24) }));
    const result = new Map<string, InformeCritico>();
    if (wanted.length === 0) return result;
    const existing = await this.prisma.informeCritico.findMany({
      where: { OR: wanted.map((w) => ({ ordenId: w.o.id, dia: w.dia })) },
    });
    for (const inf of existing) result.set(inf.ordenId, inf);
    for (const { o, dia } of wanted) {
      if (result.has(o.id)) continue;
      try {
        const created = await this.prisma.informeCritico.create({
          data: {
            ordenId: o.id,
            dia,
            horasAbierta: o.horasAbierta,
            responsableId: o.responsableId,
            ultimoComentario: o.historial.at(-1)?.comentario ?? null,
          },
        });
        result.set(o.id, created);
      } catch (e) {
        // Otro request lo creó en paralelo: se usa ese
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
        const inf = await this.prisma.informeCritico.findUnique({ where: { ordenId_dia: { ordenId: o.id, dia } } });
        if (inf) result.set(o.id, inf);
      }
    }
    return result;
  }

  async dashboard(user: AuthUser) {
    const now = Date.now();
    const full = await this.orders.findVisible(user);
    const orders = full.map((o) => toOrdenResumen(o, now));
    const open = orders.filter(isOpen);

    // Informe del día vigente de cada orden crítica vencida visible
    const vencidas = open.filter((o) => o.criticaVencida);
    const informes = await this.currentReports(vencidas);
    const informesCriticos = vencidas
      .map((o) => {
        const inf = informes.get(o.id);
        if (!inf) return null;
        return {
          id: inf.id,
          ordenId: o.id,
          horasAbierta: o.horasAbierta,
          responsable: { id: o.responsable.id, nombre: o.responsable.nombre },
          ultimoComentario: o.historial.at(-1)?.comentario ?? null,
          leido: inf.leido,
          orden: o,
        };
      })
      .filter((x) => x !== null)
      .sort((a, b) => b.horasAbierta - a.horasAbierta);

    return {
      metrics: {
        activas: open.length,
        criticas: open.filter((o) => o.prioridad === 'CRITICA').length,
        criticasVencidas: vencidas.length,
        bloqueadas: open.filter((o) => o.bloqueada).length,
        escaladas: open.filter((o) => o.escalada).length,
        listas: open.filter((o) => o.estado === 'LISTO_PARA_RETIRAR').length,
        atrasadas: open.filter((o) => o.atrasada).length,
      },
      informesCriticos,
      recientes: [...orders].sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso)).slice(0, 8),
      totalOrdenes: orders.length,
      alertasPendientes: open.filter((o) => o.prioridad === 'CRITICA' || o.bloqueada || o.escalada).length,
      rolesFaltantes: await this.setup.rolesFaltantes(user.tallerId),
    };
  }

  async alerts(user: AuthUser) {
    const now = Date.now();
    const open = (await this.orders.findVisible(user, { estado: { not: 'CERRADO' } })).map((o) => toOrdenResumen(o, now));
    const oldest = (a: { horasAbierta: number }, b: { horasAbierta: number }) => b.horasAbierta - a.horasAbierta;
    return {
      criticas: open.filter((o) => o.prioridad === 'CRITICA').sort(oldest),
      bloqueadas: open.filter((o) => o.bloqueada).sort(oldest),
      escaladas: open.filter((o) => o.escalada).sort(oldest),
    };
  }

  async markRead(user: AuthUser, informeId: string): Promise<void> {
    const inf = await this.prisma.informeCritico.findUnique({ where: { id: informeId } });
    if (!inf) throw new NotFoundException('El informe no existe');
    await this.orders.get(user, inf.ordenId); // 403 si la orden no es visible para el usuario
    await this.prisma.informeCritico.update({ where: { id: informeId }, data: { leido: true } });
  }
}
