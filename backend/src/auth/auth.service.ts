import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { MAX_TALLERES } from '../domain/setup';
import { SERVICIOS_INICIALES } from '../domain/servicios';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { toUsuario } from '../common/mappers';
import { corteDeSesiones, nuevaSesion } from './sessions';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ChangePasswordDto, RegisterDto } from '../setup/setup.dto';

@Injectable()
export class AuthService {
  /** Hash real de una contraseña descartable: si el email no existe se verifica contra él,
   *  así el tiempo de respuesta no revela qué emails existen. */
  private readonly dummyHash = argon2.hash('usuario-inexistente');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const ok = await argon2.verify(hash, password).catch(() => false);
    if (!user || !user.activo || !ok) throw new UnauthorizedException('Email o contraseña incorrectos');
    return { token: await this.jwt.signAsync(nuevaSesion(user.id)), user: toUsuario(user) };
  }

  /** Taller nuevo: crea el taller, su Admin y los servicios iniciales. Las demás personas las crea el Admin. */
  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Un registro a la vez: así dos personas no pasan juntas el límite de talleres
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7311)`;
        if ((await tx.taller.count()) >= MAX_TALLERES) {
          throw new ConflictException(`Se alcanzó el máximo de ${MAX_TALLERES} talleres`);
        }
        if (await tx.usuario.findUnique({ where: { email: dto.email } })) throw new ConflictException('Ese email ya está en uso');
        const taller = await tx.taller.create({ data: { nombre: dto.tallerNombre } });
        await tx.servicio.createMany({ data: SERVICIOS_INICIALES.map((s) => ({ ...s, tallerId: taller.id })) });
        return tx.usuario.create({ data: { tallerId: taller.id, nombre: dto.nombre, email: dto.email, passwordHash, roles: ['ADMIN'] } });
      });
      return { token: await this.jwt.signAsync(nuevaSesion(user.id)), user: toUsuario(user) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ese email ya está en uso');
      }
      throw e;
    }
  }

  /** Cambia la contraseña, cierra las demás sesiones y devuelve un token nuevo para la actual. */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<string> {
    const user = await this.prisma.usuario.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, dto.actual).catch(() => false);
    if (!ok) throw new UnauthorizedException('La contraseña actual no es correcta');
    if (dto.nueva === dto.actual) throw new BadRequestException('La contraseña nueva tiene que ser distinta de la actual');
    await this.prisma.usuario.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(dto.nueva), sesionesDesde: corteDeSesiones() } });
    return this.jwt.signAsync(nuevaSesion(userId));
  }
}
