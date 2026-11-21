// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';

// La dirección del backend queda fija dentro del build: sin ella, la app publicada no sabría a
// qué servidor hablar (las pantallas corren en el navegador y el error recién se vería ahí).
/** @type {{ argv: string[]; env: Record<string, string | undefined>; cwd(): string }} */
const proceso = /** @type {any} */ (globalThis).process;
const modo = proceso.argv.includes('dev') ? 'development' : 'production';
const enVercel = proceso.env.VERCEL === '1';
const definida = ({ ...loadEnv(modo, proceso.cwd(), 'PUBLIC_'), ...proceso.env }).PUBLIC_API_URL?.trim();

// En Vercel el navegador habla con «/api» del mismo sitio y vercel.json lo reenvía al backend
// en Render. Así la cookie de sesión es del propio sitio: si el frontend llamara directo a
// *.onrender.com (otro sitio para el navegador), la sesión no se guardaría y el login fallaría.
const PUBLIC_API_URL = definida || (enVercel ? '/api' : '');
if (!PUBLIC_API_URL) {
  throw new Error('Falta PUBLIC_API_URL: definila en frontend/.env (ej. http://localhost:3000/api)');
}
if (enVercel && /\.onrender\.com/i.test(PUBLIC_API_URL)) {
  throw new Error('En Vercel, PUBLIC_API_URL tiene que ser «/api» (o no definirse): la dirección de Render va en frontend/vercel.json. Llamar directo a onrender.com rompe el login.');
}

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    // La dirección resuelta arriba (en Vercel, «/api» aunque no esté definida)
    define: { 'import.meta.env.PUBLIC_API_URL': JSON.stringify(PUBLIC_API_URL) },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-dev-runtime',
        '@dnd-kit/core',
        '@dnd-kit/utilities',
        '@tanstack/react-query',
        'react-hook-form',
        '@hookform/resolvers/zod',
        'zod',
        'lucide-react',
        'clsx',
        'tailwind-merge',
      ],
    },
  },

  adapter: vercel(),
});