/** Servicios con los que arranca cada taller nuevo. Después el Admin los ajusta en Configuración. */
export const SERVICIOS_INICIALES = [
  { codigo: 'DIAG', nombre: 'Diagnóstico general', descripcion: 'Revisión completa de hardware y software.', precioBase: 15000 },
  { codigo: 'LIMP', nombre: 'Limpieza y cambio de pasta térmica', descripcion: 'Limpieza interna, ventiladores y pasta térmica.', precioBase: 25000 },
  { codigo: 'SO', nombre: 'Instalación de sistema operativo', descripcion: 'Formateo, instalación y drivers. Incluye respaldo básico.', precioBase: 30000 },
  { codigo: 'PANT', nombre: 'Cambio de pantalla', descripcion: 'Reemplazo de panel LCD/LED de notebook (repuesto aparte).', precioBase: 35000 },
  { codigo: 'PLACA', nombre: 'Reparación de placa', descripcion: 'Diagnóstico y reparación a nivel componente.', precioBase: 60000 },
  { codigo: 'UPG', nombre: 'Upgrade RAM / SSD', descripcion: 'Instalación de memoria o disco y migración de datos.', precioBase: 20000 },
  { codigo: 'DATOS', nombre: 'Recuperación de datos', descripcion: 'Recuperación desde discos dañados o borrados.', precioBase: 45000 },
] as const;
