-- Sesiones emitidas antes de esta fecha dejan de valer (cambio o reseteo de contraseña, desactivación)
ALTER TABLE "Usuario" ADD COLUMN "sesionesDesde" TIMESTAMP(3);
