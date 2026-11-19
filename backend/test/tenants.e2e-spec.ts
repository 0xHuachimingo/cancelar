/**
 * Varios talleres: cada uno ve solo sus datos y hay un máximo de 5.
 * Esquema propio de PostgreSQL (e2e_tenants), sin datos de desarrollo.
 */
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { dropTestSchema, testDatabaseUrl } from './test-db';

process.env.DATABASE_URL = testDatabaseUrl('e2e_tenants');
process.env.UPLOAD_DIR = 'uploads-test-esc';
process.env.JWT_SECRET = 'test-secret-de-al-menos-treinta-y-dos-caracteres';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

type Agent = ReturnType<typeof request.agent>;
interface Id { id: string }
interface Orden extends Id { numero: string }

const root = resolve(__dirname, '..');
const run = (cmd: string) => execSync(cmd, { cwd: root, env: { ...process.env, SEED_USERS: 'false' }, stdio: 'pipe' });
const clave = 'una-clave-larga-1';
const manana = () => new Date(Date.now() + 864e5).toISOString();

describe('Varios talleres (e2e)', () => {
  let app: INestApplication;
  const anon = () => request(app.getHttpServer());

  /** Registra un taller, le da todos los roles al Admin y termina la configuración. */
  async function taller(n: number): Promise<{ admin: Agent; adminId: string }> {
    const admin = request.agent(app.getHttpServer());
    const u = (await admin.post('/api/auth/register')
      .send({ tallerNombre: `Taller ${n}`, nombre: `Admin ${n}`, email: `admin${n}@talleres.com`, password: clave }).expect(201)).body as Id;
    await admin.patch(`/api/setup/users/${u.id}`).send({ roles: ['ADMIN', 'SUPERVISOR', 'RECEPCION', 'TECNICO'] }).expect(200);
    await admin.post('/api/setup/complete').expect(200);
    return { admin, adminId: u.id };
  }

  async function orden(a: Agent, adminId: string, telefono: string, serie: string): Promise<{ cliente: Id; equipo: Id; orden: Orden; servicio: Id }> {
    const cliente = (await a.post('/api/clients').send({ nombre: 'Cliente', telefono }).expect(201)).body as Id;
    const equipo = (await a.post('/api/equipment').send({ clienteId: cliente.id, tipo: 'NOTEBOOK', marca: 'HP', modelo: 'X', numeroSerie: serie }).expect(201)).body as Id;
    const servicio = ((await a.get('/api/services').expect(200)).body as Id[])[0]!;
    const o = (await a.post('/api/orders').send({
      clienteId: cliente.id, equipoId: equipo.id, servicioId: servicio.id, responsableId: adminId, tecnicoId: adminId,
      fallaReportada: 'No enciende de ninguna forma', impacto: 'MEDIO', urgencia: 'MEDIA', fechaEstimada: manana(),
    }).expect(201)).body as Orden;
    return { cliente, equipo, orden: o, servicio };
  }

  beforeAll(async () => {
    await dropTestSchema(process.env.DATABASE_URL!);
    run('npx prisma migrate deploy');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    rmSync(resolve(root, process.env.UPLOAD_DIR!), { recursive: true, force: true });
    await dropTestSchema(process.env.DATABASE_URL!); // no dejar datos de prueba
  });

  it('cada taller ve solo lo suyo, aunque repita teléfonos y números de serie', async () => {
    const t1 = await taller(1);
    const t2 = await taller(2);
    const a = await orden(t1.admin, t1.adminId, '11 4000-0000', 'SERIE-1');
    const b = await orden(t2.admin, t2.adminId, '11 4000-0000', 'SERIE-1'); // mismo teléfono y serie: otro taller

    // Cada uno numera desde 1
    expect(a.orden.numero).toMatch(/-0001$/);
    expect(b.orden.numero).toMatch(/-0001$/);

    // Listados: solo lo propio
    expect(((await t2.admin.get('/api/clients').expect(200)).body as Id[]).map((c) => c.id)).toEqual([b.cliente.id]);
    expect(((await t2.admin.get('/api/equipment').expect(200)).body as Id[]).map((e) => e.id)).toEqual([b.equipo.id]);
    expect(((await t2.admin.get('/api/orders').expect(200)).body as Id[]).map((o) => o.id)).toEqual([b.orden.id]);
    expect(((await t2.admin.get('/api/users').expect(200)).body as Id[]).map((u) => u.id)).toEqual([t2.adminId]);
    expect(((await t2.admin.get('/api/setup/users').expect(200)).body as Id[])).toHaveLength(1);
    expect((await t2.admin.get('/api/dashboard').expect(200)).body).toMatchObject({ totalOrdenes: 1 });

    // Acceso directo por id a datos de otro taller: como si no existieran
    await t2.admin.get(`/api/orders/${a.orden.id}`).expect(404);
    await t2.admin.post(`/api/orders/${a.orden.id}/transitions`).send({ to: 'EN_DIAGNOSTICO', comentario: 'Intento' }).expect(404);
    await t2.admin.get(`/api/equipment/${a.equipo.id}/orders`).expect(200).expect([]);
    await t2.admin.patch(`/api/setup/users/${t1.adminId}`).send({ activo: false }).expect(404);
    await t2.admin.patch(`/api/setup/services/${a.servicio.id}`).send({ precioBase: 1 }).expect(404);

    // No se pueden armar órdenes con datos ajenos
    const ajena = await t2.admin.post('/api/orders').send({
      clienteId: a.cliente.id, equipoId: a.equipo.id, servicioId: a.servicio.id, responsableId: t1.adminId,
      fallaReportada: 'Intento con datos de otro taller', impacto: 'BAJO', urgencia: 'BAJA', fechaEstimada: manana(),
    }).expect(400);
    expect((ajena.body as { details: string[] }).details).toEqual(['Falta el cliente', 'Falta el equipo', 'Falta el servicio', 'Falta el responsable']);
    await t2.admin.post('/api/equipment').send({ clienteId: a.cliente.id, tipo: 'OTRO', marca: 'X', modelo: 'Y', numeroSerie: 'OTRA' }).expect(400);
    await t2.admin.patch(`/api/orders/${b.orden.id}`).send({ tecnicoId: t1.adminId }).expect(400);
  });

  it('admite hasta 5 talleres', async () => {
    for (const n of [3, 4, 5]) await taller(n);
    const s = (await anon().get('/api/setup/status').expect(200)).body as { talleres: number; registroAbierto: boolean };
    expect(s).toMatchObject({ talleres: 5, registroAbierto: false });
    const r = await anon().post('/api/auth/register').send({ tallerNombre: 'Sexto', nombre: 'Seis', email: 'seis@talleres.com', password: clave }).expect(409);
    expect((r.body as { message: string }).message).toBe('Se alcanzó el máximo de 5 talleres');
  });

});
