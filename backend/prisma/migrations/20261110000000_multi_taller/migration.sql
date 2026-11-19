-- Varios talleres (máximo 5, se controla en la API): cada uno con sus propios datos.

-- El id del taller pasa a ser autoincremental
CREATE SEQUENCE taller_id_seq;
ALTER TABLE "Taller" ALTER COLUMN "id" SET DEFAULT nextval('taller_id_seq');
ALTER SEQUENCE taller_id_seq OWNED BY "Taller"."id";
SELECT setval('taller_id_seq', COALESCE((SELECT MAX("id") FROM "Taller"), 0) + 1, false);

-- Los datos que ya existían son del taller 1 (si había datos sin taller, se crea)
INSERT INTO "Taller" ("id", "nombre", "configurado")
SELECT 1, 'Mi taller', true
WHERE NOT EXISTS (SELECT 1 FROM "Taller" WHERE "id" = 1)
  AND (EXISTS (SELECT 1 FROM "Usuario") OR EXISTS (SELECT 1 FROM "Servicio"));

ALTER TABLE "Usuario" ADD COLUMN "tallerId" INTEGER;
ALTER TABLE "Cliente" ADD COLUMN "tallerId" INTEGER;
ALTER TABLE "Equipo" ADD COLUMN "tallerId" INTEGER;
ALTER TABLE "Servicio" ADD COLUMN "tallerId" INTEGER;
ALTER TABLE "Orden" ADD COLUMN "tallerId" INTEGER;
UPDATE "Usuario" SET "tallerId" = 1;
UPDATE "Cliente" SET "tallerId" = 1;
UPDATE "Equipo" SET "tallerId" = 1;
UPDATE "Servicio" SET "tallerId" = 1;
UPDATE "Orden" SET "tallerId" = 1;
ALTER TABLE "Usuario" ALTER COLUMN "tallerId" SET NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "tallerId" SET NOT NULL;
ALTER TABLE "Equipo" ALTER COLUMN "tallerId" SET NOT NULL;
ALTER TABLE "Servicio" ALTER COLUMN "tallerId" SET NOT NULL;
ALTER TABLE "Orden" ALTER COLUMN "tallerId" SET NOT NULL;

-- El correlativo de órdenes pasa a ser por taller
UPDATE "Contador" SET "clave" = regexp_replace("clave", '^orden-(\d{4})$', 'orden-1-\1') WHERE "clave" ~ '^orden-\d{4}$';

-- Lo que antes era único en todo el sistema ahora es único dentro de cada taller
DROP INDEX "Cliente_nombreNormalizado_idx";
DROP INDEX "Cliente_telefonoNormalizado_key";
DROP INDEX "Equipo_numeroSerie_key";
DROP INDEX "Orden_numero_key";
DROP INDEX "Servicio_codigo_key";
CREATE INDEX "Cliente_tallerId_nombreNormalizado_idx" ON "Cliente"("tallerId", "nombreNormalizado");
CREATE UNIQUE INDEX "Cliente_tallerId_telefonoNormalizado_key" ON "Cliente"("tallerId", "telefonoNormalizado");
CREATE UNIQUE INDEX "Equipo_tallerId_numeroSerie_key" ON "Equipo"("tallerId", "numeroSerie");
CREATE INDEX "Orden_tallerId_idx" ON "Orden"("tallerId");
CREATE UNIQUE INDEX "Orden_tallerId_numero_key" ON "Orden"("tallerId", "numero");
CREATE UNIQUE INDEX "Servicio_tallerId_codigo_key" ON "Servicio"("tallerId", "codigo");
CREATE INDEX "Usuario_tallerId_idx" ON "Usuario"("tallerId");

ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "Taller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "Taller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "Taller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "Taller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "Taller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
