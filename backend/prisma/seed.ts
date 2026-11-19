/**
 * Semilla: taller de desarrollo (id 1) con sus usuarios y servicios. NO crea clientes, equipos ni órdenes
 * (el sistema arranca vacío). Es idempotente: se puede correr varias veces.
 *
 *   npm run db:seed
 *
 * Contraseña de los usuarios de desarrollo: variable SEED_PASSWORD (por defecto "demo1234").
 * En producción usá SEED_USERS=false: no carga nada, y cada taller se registra desde la portada.
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';
import type { Rol } from '../src/generated/prisma/enums';
import { SERVICIOS_INICIALES } from '../src/domain/servicios';
import { createPgAdapter } from '../src/prisma/adapter';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta DATABASE_URL');
const prisma = new PrismaClient({ adapter: createPgAdapter(url) });

const USERS: { nombre: string; email: string; roles: Rol[] }[] = [
  { nombre: 'Laura Méndez', email: 'admin@serviciotecnico.local', roles: ['ADMIN'] },
  { nombre: 'Ana Ríos', email: 'supervisor@serviciotecnico.local', roles: ['SUPERVISOR'] },
  { nombre: 'Martín Sosa', email: 'recepcion@serviciotecnico.local', roles: ['RECEPCION'] },
  { nombre: 'Carlos Ibáñez', email: 'carlos@serviciotecnico.local', roles: ['TECNICO'] },
  { nombre: 'Julieta Paz', email: 'julieta@serviciotecnico.local', roles: ['TECNICO'] },
];


async function main() {
  // SEED_USERS=false: base para uso real, vacía. Cada taller se crea desde la portada («Crear cuenta»)
  if (process.env.SEED_USERS === 'false') {
    console.log('Semilla: nada que cargar (los talleres se crean desde la portada).');
    return;
  }
  const passwordHash = await argon2.hash(process.env.SEED_PASSWORD ?? 'demo1234');
  // Taller de desarrollo (id 1). Solo crea lo que falta: nunca pisa usuarios ni servicios existentes
  const taller = await prisma.taller.upsert({ where: { id: 1 }, update: {}, create: { id: 1, nombre: 'Taller de desarrollo', configurado: true } });
  // Con id explícito la secuencia no avanza: que el próximo taller no choque con este
  // SQL directo: hay que nombrar el esquema (el adaptador solo lo aplica a las consultas de Prisma)
  const tabla = `"${new URL(url!).searchParams.get('schema') ?? 'public'}"."Taller"`;
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('${tabla}', 'id'), GREATEST((SELECT MAX(id) FROM ${tabla}), 1))`);
  let nuevosUsuarios = 0;
  for (const u of USERS) {
    const existe = await prisma.usuario.findUnique({ where: { email: u.email }, select: { id: true } });
    if (existe) continue;
    await prisma.usuario.create({ data: { ...u, passwordHash, tallerId: taller.id } });
    nuevosUsuarios++;
  }
  let nuevosServicios = 0;
  for (const s of SERVICIOS_INICIALES) {
    const existe = await prisma.servicio.findUnique({ where: { tallerId_codigo: { tallerId: taller.id, codigo: s.codigo } }, select: { id: true } });
    if (existe) continue;
    await prisma.servicio.create({ data: { ...s, tallerId: taller.id } });
    nuevosServicios++;
  }
  console.log(`Semilla aplicada: ${nuevosUsuarios} usuarios y ${nuevosServicios} servicios nuevos (los existentes no se tocan).`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
