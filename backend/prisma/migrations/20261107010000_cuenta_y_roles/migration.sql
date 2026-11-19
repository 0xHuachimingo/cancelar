-- Una persona puede tener varios roles: se conserva el que tenía cada usuario
ALTER TABLE "Usuario" ADD COLUMN "roles" "Rol"[];
UPDATE "Usuario" SET "roles" = ARRAY["rol"];
ALTER TABLE "Usuario" DROP COLUMN "rol";

-- CreateTable
CREATE TABLE "Taller" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "configurado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Taller_pkey" PRIMARY KEY ("id")
);

-- Una instalación que ya tenía usuarios está en uso: no pasa por la configuración inicial
INSERT INTO "Taller" ("nombre", "configurado")
SELECT 'Mi taller', true WHERE EXISTS (SELECT 1 FROM "Usuario");
