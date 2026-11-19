import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Adaptador PostgreSQL a partir de DATABASE_URL. Respeta `?schema=` (por defecto `public`):
 * el adaptador `pg` no lo lee de la URL, así que se pasa aparte.
 */
export function createPgAdapter(databaseUrl: string): PrismaPg {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema') ?? undefined;
  url.searchParams.delete('schema');
  return new PrismaPg({ connectionString: url.toString() }, schema ? { schema } : undefined);
}
