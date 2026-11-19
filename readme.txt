BACKEND:
nest --version npm run start:dev
prisma --version

FRONTEND:
astro --version

INSTALACIONES DEL PROYECTO - SERVICIO TÉCNICO

Stack:
- Backend: NestJS + TypeScript + PostgreSQL + Prisma
- Frontend: Astro + React + Tailwind CSS
- Runtime: Node.js 24 LTS
- Gestor de paquetes: npm
- Sistema operativo de desarrollo: Windows + PowerShell
- Editor recomendado: Visual Studio Code

============================================================
1. HERRAMIENTAS DEL SISTEMA
============================================================

Node.js 24 LTS
- Permite ejecutar npm, NestJS y Astro.
- npm se instala junto con Node.js.

Comprobar instalación:

node --version
npm --version

NestJS CLI
- Permite crear y administrar el backend NestJS.

Instalación:

npm install -g @nestjs/cli

Comprobar instalación:

nest --version

PostgreSQL
- Base de datos relacional para usuarios, clientes, equipos, órdenes,
  historial, pagos, repuestos, notificaciones y reportes.

Instalación en Windows:

winget install -e --id PostgreSQL.PostgreSQL

Comprobar instalación:

psql --version

Configuración recomendada durante la instalación:
- Usuario administrador inicial: postgres
- Puerto: 5432
- Instalar pgAdmin 4 si está disponible
- Guardar de forma segura la contraseña de postgres

============================================================
2. BACKEND - NESTJS
============================================================

Ubicación:

D:\ServicioTecnico\backend

Crear proyecto NestJS:

cd D:\ServicioTecnico\backend
nest new . --package-manager npm --skip-git

Opciones seleccionadas al crear el proyecto:
- NestJS Observe: No
- Sistema de módulos: CJS (CommonJS) con Jest

Dependencias principales del backend:

npm install @nestjs/config @nestjs/swagger swagger-ui-express @nestjs/jwt @nestjs/passport passport passport-jwt passport-local argon2 class-validator class-transformer @nestjs/throttler helmet cookie-parser multer @nestjs/schedule

Tipos de TypeScript:

npm install -D @types/passport-jwt @types/passport-local @types/cookie-parser @types/multer

Prisma y PostgreSQL:

npm install @prisma/client
npm install -D prisma
npx prisma init

Funciones de las dependencias:

@nestjs/config
- Carga variables de entorno desde archivos .env.

@nestjs/swagger y swagger-ui-express
- Documentación visual y pruebas de la API REST.

@nestjs/jwt
- Creación y validación de tokens JWT.

@nestjs/passport y passport
- Sistema de autenticación para NestJS.

passport-jwt
- Autenticación mediante JWT en rutas privadas.

passport-local
- Login con email y contraseña.

argon2
- Hash seguro de contraseñas.

class-validator y class-transformer
- Validación y transformación de datos recibidos por la API.

@nestjs/throttler
- Limita solicitudes e intentos de login para reducir fuerza bruta.

helmet
- Agrega cabeceras de seguridad HTTP.

cookie-parser
- Permite leer cookies de sesión HTTP-only.

multer
- Permite subir fotos del equipo, evidencias, documentos y firmas.

@nestjs/schedule
- Permite ejecutar tareas automáticas, como detectar órdenes críticas
  abiertas durante más de 24 horas.

@prisma/client
- Cliente para leer y guardar datos en PostgreSQL.

prisma
- ORM, migraciones, modelo de datos y Prisma Studio.

Comando para iniciar el backend:

cd D:\ServicioTecnico\backend
npm run start:dev

URL local del backend:

http://localhost:3000

============================================================
3. FRONTEND - ASTRO
============================================================

Ubicación:

D:\ServicioTecnico\frontend

Crear proyecto Astro:

cd D:\ServicioTecnico\frontend
npm create astro@latest . -- --template minimal --typescript strict --install --git false

Opciones recomendadas:
- Template: Minimal
- TypeScript: Strict
- Instalar dependencias: Yes
- Inicializar Git: No

Agregar React para componentes interactivos:

npx astro add react

Agregar Tailwind CSS para estilos:

npx astro add tailwind

Cuando el asistente pregunte por instalación automática:
- Responder: y

Librerías de interfaz:

npm install lucide-react clsx tailwind-merge

Librerías de formularios, validación y datos:

npm install @tanstack/react-query react-hook-form zod @hookform/resolvers

Librerías para tablero Kanban con arrastrar y soltar:

npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

Librerías para PDF, etiquetas QR y firma digital:

npm install jspdf qrcode react-signature-canvas
npm install -D @types/qrcode

Funciones de las dependencias frontend:

React
- Permite crear islas interactivas dentro de Astro.
- Se usa para login, formularios, dashboard, Kanban, filtros y modales.

Tailwind CSS
- Sistema de estilos para crear la interfaz visual de forma rápida,
  consistente, responsive y accesible.

lucide-react
- Iconos modernos: computadora, notebook, búsqueda, usuarios, alertas,
  impresora, herramientas, pagos y configuraciones.

clsx
- Aplica clases CSS condicionales según el estado de una orden.

tailwind-merge
- Resuelve conflictos entre clases de Tailwind.

@tanstack/react-query
- Consulta datos del backend, guarda cache, actualiza listas y maneja
  estados de carga y error.

react-hook-form
- Crea formularios eficientes para clientes, equipos, órdenes,
  presupuestos, pagos y cierre de tareas.

zod
- Define reglas de validación de formularios y datos.

@hookform/resolvers
- Conecta Zod con React Hook Form.

@dnd-kit/core, @dnd-kit/sortable y @dnd-kit/utilities
- Permiten mover órdenes entre columnas del tablero Kanban.

jspdf
- Genera PDF de orden de ingreso, presupuesto y comprobante de entrega.

qrcode
- Genera códigos QR para identificar órdenes y equipos.

react-signature-canvas
- Permite capturar la firma del cliente en pantalla durante el ingreso
  o retiro del equipo.

Comando para iniciar el frontend:

cd D:\ServicioTecnico\frontend
npm run dev

URL local habitual del frontend:

http://localhost:4321

============================================================
4. EXTENSIONES RECOMENDADAS PARA VS CODE
============================================================

Instalar desde PowerShell:

code --install-extension Prisma.prisma
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss

Funciones:

Prisma.prisma
- Colores, validación y autocompletado para schema.prisma.

ESLint
- Detecta errores y problemas de estilo en JavaScript y TypeScript.

Prettier
- Formatea automáticamente el código.

Tailwind CSS IntelliSense
- Autocompleta clases de Tailwind CSS.

============================================================
5. NOTAS IMPORTANTES
============================================================

- No se usa Python ni venv en este proyecto.
- No se usa Docker por ahora.
- No ejecutar "npx prisma migrate dev" hasta que exista el modelo
  completo en backend/prisma/schema.prisma.
- El archivo .env contiene contraseñas y secretos, por lo que no debe
  subirse a GitHub.
- Se debe crear un archivo .env.example sin contraseñas reales.
- El backend se ejecuta inicialmente en el puerto 3000.
- El frontend se ejecuta inicialmente en el puerto 4321.
- PostgreSQL usa normalmente el puerto 5432.




todo base 
