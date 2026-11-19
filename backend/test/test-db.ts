/**
 * Base de las pruebas e2e: cada archivo usa su propio esquema de PostgreSQL dentro de la base
 * de TEST_DATABASE_URL (o DATABASE_URL de .env). El esquema se borra al empezar y al terminar,
 * así que nunca toca los datos de `public`.
 */
import 'dotenv/config';
import { Client } from 'pg';

/** URL con `?schema=<schema>`. Llamarla antes de importar AppModule y asignarla a DATABASE_URL. */
export function testDatabaseUrl(schema: string): string {
  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base?.startsWith('postgres')) {
    throw new Error('Las pruebas e2e necesitan PostgreSQL: definí TEST_DATABASE_URL o DATABASE_URL en .env');
  }
  const url = new URL(base);
  url.searchParams.set('schema', schema);
  return url.toString();
}

/** Borra el esquema de la URL (si existe) para arrancar desde cero. */
export async function dropTestSchema(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema');
  if (!schema || schema === 'public') throw new Error('Las pruebas no deben usar el esquema public');
  url.searchParams.delete('schema');
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schema.replace(/"/g, '""')}" CASCADE`);
  } finally {
    await client.end();
  }
}

/** Archivos mínimos con la firma (primeros bytes) correcta, para subir como evidencia. */
export function fakeJpeg(size = 100): Buffer {
  const b = Buffer.alloc(Math.max(size, 4), 1);
  b.set([0xff, 0xd8, 0xff, 0xe0]);
  return b;
}

export function fakePng(size = 100): Buffer {
  const b = Buffer.alloc(Math.max(size, 8), 1);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return b;
}
