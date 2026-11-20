import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Permission } from '../domain/permissions';
import type { Rol } from '../generated/prisma/enums';

/** Usuario autenticado que viaja en la request (sin datos sensibles). */
export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  roles: Rol[];
  /** Taller al que pertenece: todas las consultas se limitan a él. */
  tallerId: number;
}

export type AuthedRequest = Request & { user?: AuthUser };

export const IS_PUBLIC = 'isPublic';
/** Ruta accesible sin sesión. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const PERMISSIONS = 'permissions';
/** Exige al menos uno de los permisos listados (matriz de domain/permissions.ts). */
export const RequirePermission = (...permissions: Permission[]) => SetMetadata(PERMISSIONS, permissions);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.user) throw new Error('CurrentUser usado en una ruta pública');
  return req.user;
});
