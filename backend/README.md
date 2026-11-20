# ServicioTécnico — Backend (API REST)

API del sistema de workflow para el servicio técnico de PC y notebooks. Implementa el contrato que consume el frontend (`frontend/src/lib/api/httpApiClient.ts`): clientes, equipos, órdenes con su flujo de estados, evidencia, dashboard, alertas e informes de órdenes críticas.

**Stack:** NestJS 12 · TypeScript estricto · Prisma 7 · **PostgreSQL** · JWT en cookie HTTP-only · argon2 · class-validator · Swagger.

---

## Índice

1. [Puesta en marcha](#puesta-en-marcha)
2. [Usuarios iniciales](#usuarios-iniciales)
3. [Comandos](#comandos)
4. [Arquitectura](#arquitectura)
5. [Primer uso](#primer-uso)
6. [Escalamientos](#escalamientos)
7. [Endpoints](#endpoints)
8. [Seguridad](#seguridad)
9. [Pruebas](#pruebas)
10. [Antes de producción](#antes-de-producción)

---

## Puesta en marcha

Requisitos: Node.js ≥ 22, npm y **PostgreSQL 15 o superior**.

### Instalar PostgreSQL (Windows)

**En esta PC** está instalado en modo portable (sin servicio de Windows ni permisos de administrador): binarios de PostgreSQL 17 en `E:\PostgreSQL\17` y datos en `E:\PostgreSQL\data`, escuchando solo en `localhost:5432`. Para que arranque solo al entrar a Windows (crea un acceso directo oculto en la carpeta Inicio del usuario; no necesita administrador), corré una vez

```bash
npm run pg:autostart
```

`npm run pg:no-autostart` lo quita. Si no está activado, antes de levantar la API corré `npm run pg:start`. `npm run pg:stop` lo detiene y `npm run pg:status` muestra si está corriendo. Log: `E:\PostgreSQL\postgres.log`. Si se mueve la carpeta del proyecto, volvé a correr `pg:autostart` (el acceso directo apunta a este script).

**En otra PC**, cualquiera de estas opciones:

- Con permisos de administrador: el instalador de https://www.postgresql.org/download/windows/ (usuario `postgres`, puerto `5432`). Queda como servicio y no hacen falta los comandos `pg:*`.
- Sin permisos: descargá el zip «binaries» de PostgreSQL 17 desde https://www.enterprisedb.com/download-postgresql-binaries, descomprimilo de modo que quede `E:\PostgreSQL\17\bin\pg_ctl.exe` (el zip trae la carpeta `pgsql`, renombrala; para usar otra ubicación, definí las variables `PGHOME` y `PGDATA`) y creá los datos con una contraseña propia guardada en `clave.txt`:

  ```bash
  "E:\PostgreSQL\17\bin\initdb.exe" -D "E:\PostgreSQL\data" -U postgres --pwfile=clave.txt -E UTF8 --locale=C --auth=scram-sha-256
  ```

  Después borrá `clave.txt` y usá `npm run pg:start`.

En los dos casos poné la contraseña en `DATABASE_URL` de `.env`. No hace falta crear la base a mano: `prisma migrate deploy` crea `servicio_tecnico` si no existe.

### Backend

```bash
npm install
```

```bash
cp .env.example .env
```

Editá `.env`: en `DATABASE_URL` reemplazá `CONTRASENA` por la contraseña de PostgreSQL, y poné un `JWT_SECRET` aleatorio de al menos 32 caracteres. Para generarlo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Creá la base y las tablas con las migraciones, y cargá los usuarios y servicios iniciales:

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

Levantá la API:

```bash
npm run start:dev
```

- API: http://localhost:3000/api
- Documentación interactiva (Swagger): http://localhost:3000/api/docs
- Estado: http://localhost:3000/api/health

### Conectar el frontend

En `frontend/.env`:

```env
PUBLIC_API_URL=http://localhost:3000/api
```

Reiniciá `npm run dev` en el frontend. Sin esa variable, el frontend vuelve al modo demo (datos en el navegador).

## Usuarios iniciales

**Uso real:** base vacía; cada taller se registra desde la portada (los servicios se crean al registrarlo):

```bash
SEED_USERS=false npm run db:seed
```

**Desarrollo:** la semilla (`prisma/seed.ts`) crea el taller 1 («Taller de desarrollo») ya configurado, con estos usuarios y los servicios iniciales. Contraseña de desarrollo: `demo1234` (configurable con la variable `SEED_PASSWORD` antes de correr la semilla).

| Rol | Nombre | Email |
|---|---|---|
| Admin | Laura Méndez | admin@serviciotecnico.local |
| Supervisor | Ana Ríos | supervisor@serviciotecnico.local |
| Recepción | Martín Sosa | recepcion@serviciotecnico.local |
| Técnico | Carlos Ibáñez | carlos@serviciotecnico.local |
| Técnico | Julieta Paz | julieta@serviciotecnico.local |

También crea el catálogo de 7 servicios. **No crea clientes, equipos ni órdenes**: el sistema arranca vacío.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | API con recarga automática |
| `npm run build` / `npm run start:prod` | Compila a `dist/` y lo ejecuta |
| `npm run typecheck` | Chequeo de tipos (debe dar 0 errores) |
| `npm run lint` | oxlint (incluye `no-explicit-any`) |
| `npm test` | Pruebas unitarias de las reglas del workflow |
| `npm run test:e2e` | Prueba del ciclo completo en esquemas temporales de PostgreSQL (`e2e_*`) |
| `npm run db:migrate` | Crea una migración nueva tras cambiar `prisma/schema.prisma` (desarrollo) |
| `npm run db:deploy` | Aplica migraciones pendientes (producción) |
| `npm run db:seed` | Crea los usuarios y servicios que falten (nunca modifica los existentes). Con `SEED_USERS=false` no carga nada |
| `npm run db:reset` | **Borra la base** y la recrea con migraciones + semilla |
| `npm run db:studio` | Prisma Studio: ver y editar datos en el navegador |

## Arquitectura

```text
prisma/
├── schema.prisma          Modelo de datos (Usuario, Cliente, Equipo, Servicio, Orden, Evidencia,
│                          Historial, InformeCritico, Contador)
├── migrations/            Migraciones SQL versionadas
└── seed.ts                Usuarios y servicios iniciales
src/
├── main.ts                Arranque + Swagger
├── setup.ts               Prefijo /api, helmet, cookies, CORS, ValidationPipe, filtro de errores
├── config/env.ts          Validación de variables de entorno (no arranca si falta algo)
├── prisma/                PrismaService y adapter.ts (conexión PostgreSQL, respeta ?schema=)
├── domain/                Reglas de negocio puras — copia fiel del frontend:
│   ├── permissions.ts       matriz rol → permisos
│   ├── priority.ts          matriz impacto × urgencia
│   ├── transitions.ts       transiciones y requisitos (canTransition, canBlock, closeChecklist…)
│   └── alerts.ts            horas abiertas, atraso, crítica > 24 h
├── common/                Mappers a DTO (forma de frontend/src/types/domain.ts), errores, filtro
├── auth/                  Login/logout/me, guard global (cookie o Bearer) y permisos por ruta
├── catalog/               GET /users, GET /services
├── clients/  equipment/   Alta y búsqueda
├── orders/                Órdenes, workflow, evidencia (archivos en UPLOAD_DIR)
├── dashboard/             Métricas, alertas, informes críticos + tarea programada
└── health/                GET /health
```

**Reglas del workflow.** Viven en `src/domain/` y son las mismas funciones que usa el frontend para explicar qué falta. **Si cambiás una regla, cambiala en los dos lados** (`frontend/src/lib/workflow/` y `frontend/src/lib/auth/permissions.ts`). Las pruebas unitarias (`src/domain/transitions.spec.ts`) cubren la matriz de prioridad y las transiciones.

**Transacciones.** Cada acción del workflow (cambio de estado, bloqueo, validación…) carga la orden, valida reglas, actualiza y registra el historial **en una sola transacción**: o se hace todo o nada.

**Búsqueda.** Clientes y equipos guardan columnas normalizadas (minúsculas, sin tildes, teléfono solo dígitos) para buscar sin distinguir mayúsculas ni acentos, y para detectar teléfonos duplicados aunque se escriban distinto.

**Informes críticos.** Se genera un `InformeCritico` por cada orden Crítica abierta hace más de 24 h, uno por cada día que siga abierta; «Revisado» se guarda por informe, así que al cumplir otro día vuelve a aparecer sin revisar. Al abrir el dashboard se crea al instante el informe del día si falta (sin reescribir los existentes, y tolerando que dos usuarios lo pidan a la vez); cada 10 minutos una tarea programada actualiza horas y último comentario de todos.

**Evidencia.** Se recibe por multipart (campo `file`), solo imágenes o PDF, hasta `UPLOAD_MAX_MB`. El archivo se valida y se escribe a disco recién después de verificar permisos; si la transacción falla, se borra. Para usar S3 u otro almacenamiento, reimplementar `src/orders/evidence.storage.ts`.

## Primer uso

1. La portada (`/`) ofrece **Crear cuenta de taller** e **Iniciar sesión**. Quien se registra en `/registro` crea un taller nuevo (con los 7 servicios iniciales) y queda como su **Admin**. Las demás personas del taller las agrega el Admin.
2. Hasta terminar `/configuracion` (datos del taller, una persona en cada rol esencial y al menos un servicio), el Admin no sale de esa pantalla, el resto ve un aviso y la API rechaza crear órdenes.
3. Roles esenciales: Supervisor, Recepción y Técnico. Una persona puede tener **varios roles** y suma los permisos de cada uno. Si después un rol queda sin nadie activo, el dashboard del Admin avisa.

**Varios talleres:** cualquiera puede registrar un taller nuevo desde la portada, sin límite de cantidad (el registro admite 10 por minuto por IP). Personas, clientes, equipos, servicios y órdenes tienen `tallerId`, y cada consulta se limita al taller del usuario: un dato de otro taller responde como inexistente (404) y no se puede usar para armar una orden. Teléfonos, números de serie y números de orden se repiten entre talleres sin conflicto, y cada taller numera sus órdenes desde 0001. El email es único en todo el sistema (con él se ingresa), así que una persona pertenece a un solo taller. `test/tenants.e2e-spec.ts` cubre el aislamiento y el registro sin límite. `GET /setup/status` solo dice si ya hay algún taller (no cuántos).

No hay envío de emails: el Admin le pasa la contraseña temporal a cada persona y, si alguien la olvida, le pone una nueva desde Configuración.

## Escalamientos

| Nivel | Atiende | Escalan a este nivel |
|---|---|---|
| 2 | Supervisor | Técnico (sus órdenes), Recepción (reclamo del cliente o plazo) |
| 3 | Admin | Supervisor |

Ciclo: **sin tomar → tomado → resuelto**. Lo atiende su nivel o uno superior, y puede subir de nivel. Una orden tiene como máximo uno abierto (índice parcial en la base) y **no se puede cerrar** hasta resolverlo.

| Resolución | Qué pasa con la orden |
|---|---|
| Continuar | Sigue, con reasignación de técnico opcional |
| En espera | Se bloquea con ese motivo |
| No reparable / Rechazado por el cliente | Pasa a «Listo para retirar» sin reparar. Exige diagnóstico, evidencia, informe (20+ caracteres) y constancia de aviso al cliente. Queda validada por quien resuelve |

**Automático** (tarea cada 10 minutos, `syncEscalations`; plazos en `ESCALATION_HOURS` de `src/domain/escalation.ts`): crítica abierta más de 24 h → nivel 2, más de 48 h → nivel 3; atrasada más de 24 h → nivel 2; bloqueada más de 48 h → nivel 2; nivel 2 sin tomar en 24 h → nivel 3. Una causa ya resuelta no se repite hasta que vuelve a pasar su plazo. Las órdenes en «Listo para retirar» no escalan.

**Entrega:** Recepción cierra la orden si está validada. Al cerrar queda el `resultado`: Reparado, No reparable, Rechazado por el cliente o Abandonado (solo Admin, tras 60 días sin retirar).

## Endpoints

Todas las rutas llevan el prefijo `/api` y requieren sesión, salvo `health`, `auth/login`, `auth/logout`, `auth/register` y `setup/status`. La referencia completa con ejemplos está en **Swagger** (`/api/docs`).

| Método | Ruta | Permiso |
|---|---|---|
| POST | `/auth/login` · `/auth/logout` | público (login: máx. 5 intentos/min) |
| POST | `/auth/register` | público; solo si todavía no hay ninguna cuenta (crea el taller y su Admin) |
| POST | `/auth/password` | sesión |
| GET | `/setup/status` | público (talleres registrados, si hay lugar y si está el borrado de pruebas) |
| GET | `/setup/mine` | sesión (si el taller del usuario terminó la configuración) |
| GET · PATCH · POST | `/setup/progress` · `/setup/taller` · `/setup/complete` · `/setup/users` · `/setup/services` | `users.manage` (Admin) |
| GET | `/auth/me` | sesión |
| GET | `/users` · `/services` | sesión |
| GET · POST | `/clients` | crear: `client.create` |
| GET · POST | `/equipment` | crear: `equipment.create` |
| GET | `/equipment/:id/orders` | sesión (Técnico: solo sus órdenes) |
| GET · POST | `/orders` | crear: `order.create` |
| GET · PATCH | `/orders/:id` | por campo (ver abajo) |
| POST | `/orders/:id/transitions` · `block` · `unblock` · `escalate` · `reopen` · `validate` · `abandon` | reglas del workflow |
| POST | `/orders/:id/escalation/take` · `raise` · `resolve` | nivel del escalamiento |
| POST · DELETE | `/orders/:id/evidence` · `/orders/:id/evidence/:evidenceId` | editar la orden |
| GET | `/orders/:id/evidence/:evidenceId/file` | ver la orden |
| GET | `/dashboard` · `/alerts` | sesión · `nav.alertas` |
| PATCH | `/critical-reports/:id/read` | ver la orden |

`PATCH /orders/:id`: diagnóstico y solución requieren poder editar la orden (Técnico asignado, Supervisor o Admin); técnico y responsable requieren `order.assign`; impacto y urgencia, Supervisor o Admin. La prioridad **siempre** la calcula el servidor.

### Formato de errores

```json
{ "statusCode": 422, "message": "No se puede mover a «Listo para retirar»", "details": ["Falta documentar la solución"] }
```

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos (`message` es la lista de errores de validación) |
| 401 | Sin sesión o sesión vencida |
| 403 | El rol no tiene permiso / la orden no es del técnico |
| 404 | No existe |
| 409 | Teléfono, número de serie, email o nombre de servicio repetido |
| 422 | Regla del workflow no cumplida (`details` = lo que falta) |
| 429 | Demasiadas solicitudes (login) |

### Validaciones de datos

Las reglas están en `src/domain/validation.ts` (copia en `frontend/src/lib/workflow/validation.ts`), y se aplican con los decoradores de `src/common/validators.ts`. El frontend las muestra campo por campo antes de enviar; el backend las vuelve a controlar siempre.

- **Nombres** (personas, clientes, taller, servicios): de 2 al máximo del campo, con al menos una letra.
- **Teléfono**: solo números, espacios, `+`, `-` y paréntesis, de 6 a 15 dígitos. El del taller es opcional.
- **Email**: formato válido, hasta 254 caracteres, se guarda en minúsculas.
- **Contraseña nueva**: al menos 8 caracteres, con letras y números. En el registro y en «Mi cuenta» hay que repetirla, y la nueva tiene que ser distinta de la actual.
- **Servicios**: el nombre no se repite dentro del taller (sin importar mayúsculas); el precio es un entero de 0 a 100.000.000.
- **Fecha estimada de la orden**: de hoy a 365 días.
- **Búsquedas**: hasta 100 caracteres.
- **Evidencias**: hasta **10 MB** por archivo (`MAX_EVIDENCIA_MB`). `UPLOAD_MAX_MB` en `.env` solo puede bajarlo: con un valor mayor a 10 el backend no arranca.

## Seguridad

- Contraseñas con **argon2id**. El login tarda lo mismo exista o no el email.
- Sesión: JWT firmado en cookie **HTTP-only**, `SameSite=Lax`, `Secure` con `COOKIE_SECURE=true`. Duración: `JWT_EXPIRES_IN`.
- El usuario se vuelve a leer de la base en cada request: desactivar un usuario (`activo = false`) corta su acceso al instante.
- **Corte de sesiones** (`Usuario.sesionesDesde`): cambiar la propia contraseña cierra las demás sesiones (la actual recibe un token nuevo); el reseteo de contraseña por el Admin y la desactivación cierran todas, aunque después se reactive a la persona.
- **CORS** restringido a `CORS_ORIGIN` (se aceptan varios separados por coma).
- **helmet** (cabeceras de seguridad). Límite de solicitudes: 600/min por IP en general. Login: 5 intentos por minuto por **IP + email** (en un taller varias PCs comparten IP: contar solo por IP bloquearía a empleados legítimos) y además 20 por minuto por **IP**, sumando todas las cuentas, contra quien prueba una contraseña en muchas cuentas.
- Evidencia: solo JPG, PNG, WebP, GIF, HEIC y PDF. SVG y HTML se rechazan porque pueden contener scripts. Además del tipo que declara el navegador se controla la **firma** del archivo (sus primeros bytes, `src/orders/evidence.signature.ts`): un HTML o un ejecutable renombrado como `.jpg` se rechaza.
- `ValidationPipe` con `whitelist`: los campos que no están en el DTO se descartan (ej. un `prioridad` enviado por el cliente).
- Evidencias: tipo y tamaño validados, nombres de archivo aleatorios, sin acceso fuera de `UPLOAD_DIR`.
- Búsquedas: los comodines de `LIKE` (`%`, `_`) se escapan, así que se buscan como texto. Las consultas van siempre parametrizadas (Prisma).
- Errores: nunca devuelven trazas ni rutas internas; un cuerpo JSON demasiado grande responde 413.
- Documentación interactiva (`/api/docs`): solo fuera de producción (`NODE_ENV=production` la apaga).
- Dependencias: `npm audit --omit=dev` sin vulnerabilidades al 19/11/2026. Las que reporta `npm audit` completo son de herramientas de desarrollo (pruebas y compilación), que no se despliegan.

## Pruebas

```bash
npm test
```

```bash
npm run test:e2e
```

Necesitan PostgreSQL corriendo. Cada archivo usa su propio esquema (`e2e_workflow`, `e2e_edge`) dentro de la base de `TEST_DATABASE_URL` o, si no está definida, de `DATABASE_URL`; nunca toca `public`. Cada archivo borra y recrea su esquema, aplica migraciones y semilla. `security.e2e-spec.ts` cubre seguridad y validaciones: rutas sin sesión, tokens falsificados o vencidos, permisos por rol, campos que el cliente no debe controlar, inyección SQL y comodines, `__proto__`, HTML guardado como texto, firma y tamaño de archivos, `../` en nombres, cabeceras, errores sin detalles internos, corte de sesiones, fuerza bruta y los límites de cada campo. Al terminar, cada archivo borra su esquema y su carpeta de evidencias: no quedan datos de prueba. `escalation.e2e-spec.ts` cubre niveles, ciclo, sin reparación, entrega y escalamiento automático; `setup.e2e-spec.ts`, el primer uso, los varios roles y las validaciones de datos. `workflow.e2e-spec.ts` recorre con los cuatro roles: alta de cliente/equipo/orden, visibilidad del Técnico, reglas con 422, bloqueo y desbloqueo, escalado, evidencia con archivo real, validación, cierre, reapertura, historial completo, crítica > 24 h en el dashboard y límite de intentos de login.

## Antes de producción

- `JWT_SECRET` nuevo y largo; `COOKIE_SECURE=true` detrás de HTTPS; `CORS_ORIGIN` con el dominio real; `NODE_ENV=production`.
- Cabeceras de seguridad para el frontend en el servidor web o proxy (casi todas sus páginas son estáticas): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y HSTS.
- Cambiar las contraseñas de los usuarios iniciales o crearlos con `SEED_PASSWORD` propio.
- Respaldos periódicos de PostgreSQL (`pg_dump`) y de `UPLOAD_DIR`. Un usuario de base propio para la app en lugar de `postgres`.
- `npm run build` y `npm run db:deploy` en el servidor; ejecutar con `npm run start:prod` (o un gestor de procesos).
