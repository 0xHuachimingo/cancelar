# Deploy: frontend en Vercel + backend en Render

| Parte | Dónde | Dirección |
|---|---|---|
| Frontend | Vercel | https://cancelar-mu.vercel.app |
| Backend (API) | Render (web service) | https://TU-BACKEND.onrender.com |
| Base de datos | Render (PostgreSQL) | interna de Render |

## Cómo se conectan (y por qué así)

El navegador **nunca** llama a `onrender.com`: le habla a `https://cancelar-mu.vercel.app/api/...` y Vercel reenvía esos pedidos al backend en Render (`frontend/vercel.json`).

Es necesario por la sesión: el login guarda una cookie, y `vercel.app` y `onrender.com` son sitios distintos para el navegador. Si el frontend llamara directo a Render, la cookie no se guardaría y **el login fallaría**. A través de `/api` todo es el mismo sitio.

Por eso, en Vercel **no** hay que poner `PUBLIC_API_URL` (el frontend usa `/api` solo). Si alguien la pone con una dirección de `onrender.com`, el build se detiene con un mensaje que lo explica.

---

## 1. Backend y base en Render

1. En https://dashboard.render.com: **New → Blueprint**, elegir el repositorio `0xHuachimingo/cancelar`. Render lee `render.yaml` (en la raíz) y crea:
   - la base PostgreSQL `servicio-tecnico-db`, con usuario y contraseña generados por Render;
   - el servicio web `servicio-tecnico-api` (carpeta `backend`), con `DATABASE_URL` conectada a esa base, un `JWT_SECRET` aleatorio y el resto de las variables.
2. Esperá a que termine el primer deploy. Al arrancar aplica las migraciones solo (`npx prisma migrate deploy`).
3. Copiá la dirección del servicio (arriba a la izquierda, algo como `https://servicio-tecnico-api.onrender.com`) y comprobá:

   ```bash
   curl https://servicio-tecnico-api.onrender.com/api/health
   ```

   Tiene que responder `{"status":"ok","db":"ok",...}`.

Las credenciales de la base las genera Render y las conecta solas: no hace falta copiarlas de ningún lado. (Si preferís usar el `JWT_SECRET` de `backend/.env.production`, pegalo en *Environment* del servicio en lugar del generado.)

**Planes de Render:**

- **Evidencias:** las fotos y PDF se guardan en el disco persistente (`/var/data`). Ese disco solo existe en planes pagos (Starter o superior). En el plan gratis hay que borrar el bloque `disk:` de `render.yaml`, y las evidencias **se pierden** en cada reinicio o deploy.
- **Plan gratis:** el servicio se duerme tras 15 minutos sin uso (el primer pedido tarda cerca de un minuto en despertar) y mientras duerme no corren las tareas automáticas (escalamiento cada 10 minutos). La base gratis de Render vence a los 30 días.

## 2. Conectar Vercel con Render

En `frontend/vercel.json`, reemplazá `TU-BACKEND.onrender.com` por la dirección real del servicio:

```json
"destination": "https://servicio-tecnico-api.onrender.com/api/:path*"
```

Hacé commit y push a `main`: Vercel vuelve a publicar.

## 3. Configuración del proyecto en Vercel

En Vercel → el proyecto → **Settings → Build and Deployment**:

- **Root Directory: `frontend`**. Hoy está compilando la carpeta `backend` (por eso aparecía el error de `DATABASE_URL`). El backend no va en Vercel.
- **Framework Preset:** Astro (lo detecta solo).
- **Environment Variables:** ninguna obligatoria. No agregues `PUBLIC_API_URL`.

El repositorio tiene además un workflow de GitHub (`.github/workflows/deploy.yml`) que también publica en Vercel en cada push a `main`. Si el proyecto ya está conectado al repositorio desde Vercel, se publica dos veces; alcanza con uno de los dos.

## 4. Primer uso

1. Abrí https://cancelar-mu.vercel.app.
2. **Crear cuenta de taller**: quien la crea queda como Admin.
3. En Configuración, agregá a las personas y asigná todos los roles (Supervisor, Recepción y Técnico).

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| «No se pudo conectar con el servidor» | `vercel.json` sigue con `TU-BACKEND`, o el backend en Render está dormido o caído (`/api/health`). |
| El login no responde o da 403 «Solicitud bloqueada» | `CORS_ORIGIN` en Render no es exactamente `https://cancelar-mu.vercel.app`. |
| Inicia sesión pero enseguida vuelve al login | El frontend está llamando directo a `onrender.com` (no debe definirse `PUBLIC_API_URL` en Vercel). |
| El backend no arranca y el log dice qué variable corregir | Con `NODE_ENV=production` no arranca con configuración insegura (cookie sin `Secure`, orígenes sin `https://`). |
| Muchos «Demasiados intentos» de login | `TRUST_PROXY` no coincide con los proxies reales: el backend ve a todos con la misma IP. En el log `Seguridad`, los eventos `login.ok` deben mostrar IPs distintas por persona; si todas son iguales, probá `TRUST_PROXY=3`. |
| Fotos o PDF que desaparecen | Plan sin disco persistente (ver «Planes de Render»). |

Subir evidencias grandes (cerca de 10 MB) pasa por el reenvío de Vercel: probá una vez con un archivo de ese tamaño después del primer deploy.
