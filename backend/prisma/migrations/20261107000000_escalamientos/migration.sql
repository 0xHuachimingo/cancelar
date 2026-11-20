-- CreateEnum
CREATE TYPE "CausaEscalamiento" AS ENUM ('TECNICA', 'REPUESTO', 'PRESUPUESTO', 'RECLAMO_CLIENTE', 'PLAZO', 'CRITICA_24H', 'BLOQUEO_PROLONGADO');

-- CreateEnum
CREATE TYPE "EstadoEscalamiento" AS ENUM ('ABIERTO', 'TOMADO', 'RESUELTO');

-- CreateEnum
CREATE TYPE "ResolucionEscalamiento" AS ENUM ('CONTINUAR', 'EN_ESPERA', 'NO_REPARABLE', 'RECHAZADO_CLIENTE');

-- CreateEnum
CREATE TYPE "ResultadoOrden" AS ENUM ('REPARADO', 'NO_REPARABLE', 'RECHAZADO_CLIENTE', 'ABANDONADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoAccion" ADD VALUE 'ESCALADO_TOMADO';
ALTER TYPE "TipoAccion" ADD VALUE 'ESCALADO_NIVEL';
ALTER TYPE "TipoAccion" ADD VALUE 'ESCALADO_RESUELTO';

-- DropForeignKey
ALTER TABLE "Historial" DROP CONSTRAINT "Historial_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Historial" ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Orden" ADD COLUMN     "avisoCliente" TEXT,
ADD COLUMN     "informeNoReparacion" TEXT,
ADD COLUMN     "resultado" "ResultadoOrden";

-- CreateTable
CREATE TABLE "Escalamiento" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "causa" "CausaEscalamiento" NOT NULL,
    "motivo" TEXT NOT NULL,
    "automatico" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoEscalamiento" NOT NULL DEFAULT 'ABIERTO',
    "creadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tomadoPorId" TEXT,
    "tomadoEn" TIMESTAMP(3),
    "resueltoPorId" TEXT,
    "resueltoEn" TIMESTAMP(3),
    "resolucion" "ResolucionEscalamiento",
    "textoResolucion" TEXT,

    CONSTRAINT "Escalamiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Escalamiento_ordenId_idx" ON "Escalamiento"("ordenId");

-- CreateIndex
CREATE INDEX "Escalamiento_estado_nivel_idx" ON "Escalamiento"("estado", "nivel");

-- AddForeignKey
ALTER TABLE "Historial" ADD CONSTRAINT "Historial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalamiento" ADD CONSTRAINT "Escalamiento_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalamiento" ADD CONSTRAINT "Escalamiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalamiento" ADD CONSTRAINT "Escalamiento_tomadoPorId_fkey" FOREIGN KEY ("tomadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalamiento" ADD CONSTRAINT "Escalamiento_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Una orden tiene como máximo un escalamiento sin resolver
CREATE UNIQUE INDEX "Escalamiento_ordenId_abierto_key" ON "Escalamiento"("ordenId") WHERE "estado" <> 'RESUELTO';

-- Las órdenes que ya estaban cerradas se repararon
UPDATE "Orden" SET "resultado" = 'REPARADO' WHERE "estado" = 'CERRADO';

-- Las órdenes marcadas como escaladas pasan a tener su registro de nivel 2
INSERT INTO "Escalamiento" ("id", "ordenId", "nivel", "causa", "motivo")
SELECT 'esc-' || "id", "id", 2, 'TECNICA', COALESCE("motivoEscalado", 'Escalada antes del registro de escalamientos')
FROM "Orden" WHERE "escalada" = true AND "estado" <> 'CERRADO';
