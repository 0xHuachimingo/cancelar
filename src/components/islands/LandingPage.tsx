import { useEffect, useState } from 'react';
import {
  ArrowRight, ArrowUpCircle, Building2, ClipboardList, Cpu, FlaskConical, Gauge, LogIn, ShieldCheck, Trash2, UserPlus, Users,
  type LucideIcon,
} from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Toaster } from '@/components/ui/Toast';
import { apiClient, type SetupStatus } from '@/lib/api/apiClient';
import { isMockApi } from '@/lib/api/config';
import { loadSession, signOut } from '@/lib/auth/mockCurrentUser';
import { notifyError } from '@/lib/notify';
import type { Usuario } from '@/types/domain';

const FEATURES: readonly { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ClipboardList, title: 'Del ingreso a la entrega', text: 'Cada orden pasa por diagnóstico, reparación y pruebas, con historial y comentarios en cada paso.' },
  { icon: Gauge, title: 'Prioridad automática', text: 'Impacto × urgencia decide qué va primero. Las críticas de más de 24 h saltan a la vista.' },
  { icon: ArrowUpCircle, title: 'Escalamientos con dueño', text: 'Lo que el técnico no puede resolver sube al Supervisor o al Admin, y se escala solo si nadie lo atiende.' },
  { icon: Users, title: 'Roles claros', text: 'Admin, Supervisor, Recepción y Técnico. En un taller chico, una persona puede cumplir varios.' },
];

/** Solo pruebas: borra todo después de escribir BORRAR. */
function ResetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setTexto('');
  }, [open]);

  async function borrar() {
    setBusy(true);
    try {
      await apiClient.resetDatabase();
      await signOut();
      window.location.reload();
    } catch (e) {
      notifyError(e);
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Borrar toda la base de datos"
      description="Se borran todos los talleres, personas, clientes, equipos, órdenes y evidencias. No se puede deshacer."
      icon={<Trash2 className="text-danger" aria-hidden="true" />}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="danger" loading={busy} disabled={texto !== 'BORRAR'} onClick={() => void borrar()}>
            Borrar todo
          </Button>
        </>
      }
    >
      <Input
        id="reset-confirmacion"
        label="Escribí BORRAR para confirmar"
        autoComplete="off"
        data-autofocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
    </Modal>
  );
}

/** Portada pública: qué es el sistema, entrar o registrar un taller. */
export default function LandingPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    void apiClient.getSetupStatus().then(setStatus, () => undefined);
    void loadSession().then(setUser);
  }, []);

  const libres = status ? status.maxTalleres - status.talleres : null;
  const puedeRegistrar = !isMockApi && status?.registroAbierto === true;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-fg">
            <Cpu className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold">ServicioTécnico</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <LinkButton href="/dashboard" variant="outline">Ir al sistema <ArrowRight className="size-4" aria-hidden="true" /></LinkButton>
            ) : (
              <LinkButton href="/login" variant="outline" leftIcon={<LogIn aria-hidden="true" />}>Iniciar sesión</LinkButton>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Gestión de reparaciones de PC y notebooks</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight font-bold tracking-tight md:text-5xl">
            Cada equipo, del ingreso a la entrega, sin perder el hilo.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Órdenes de servicio, tablero de trabajo, alertas de lo urgente y escalamientos para tu taller. Creá la cuenta, definí quién
            cumple cada rol y empezá a cargar órdenes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {user ? (
              <LinkButton href="/dashboard" size="lg">Ir al sistema <ArrowRight className="size-4" aria-hidden="true" /></LinkButton>
            ) : isMockApi ? (
              <LinkButton href="/login" size="lg">Entrar a la demo <ArrowRight className="size-4" aria-hidden="true" /></LinkButton>
            ) : (
              <>
                {puedeRegistrar && (
                  <LinkButton href="/registro" size="lg" leftIcon={<UserPlus aria-hidden="true" />}>Crear cuenta de taller</LinkButton>
                )}
                <LinkButton href="/login" size="lg" variant="outline" leftIcon={<LogIn aria-hidden="true" />}>Iniciar sesión</LinkButton>
              </>
            )}
          </div>
          {!isMockApi && status && (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted">
              <Building2 className="size-4" aria-hidden="true" />
              {libres && libres > 0
                ? `Quedan ${libres} de ${status.maxTalleres} lugares para talleres.`
                : `Los ${status.maxTalleres} lugares para talleres están ocupados.`}
            </p>
          )}
        </section>

        <section aria-label="Qué incluye" className="border-t border-border bg-surface-2/40">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="p-5">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <h2 className="mt-3 font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-semibold">Cómo empezar</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              ['Creá la cuenta', 'Quien la crea queda como Admin del taller.'],
              ['Definí los roles', 'Agregá a tu equipo y asigná Supervisor, Recepción y Técnico.'],
              ['Cargá órdenes', 'Con los roles cubiertos, el taller queda listo para trabajar.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">{i + 1}</span>
                <div>
                  <p className="font-medium">{t}</p>
                  <p className="text-sm text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {status?.resetHabilitado && (
          <section className="mx-auto max-w-6xl px-4 pb-12">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-red-300 bg-red-50/60 p-4 dark:border-red-400/30 dark:bg-red-400/5">
              <FlaskConical className="size-5 shrink-0 text-danger" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">Zona de pruebas</p>
                <p className="text-muted">Borra todos los talleres y sus datos para empezar de cero. Se quita en la versión final.</p>
              </div>
              <Button variant="danger" leftIcon={<Trash2 aria-hidden="true" />} onClick={() => setResetOpen(true)}>
                Borrar toda la base
              </Button>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        <ShieldCheck className="mr-1 inline size-3.5" aria-hidden="true" />
        Cada taller ve solo sus propios datos.
      </footer>
      <ResetModal open={resetOpen} onClose={() => setResetOpen(false)} />
      <Toaster />
    </div>
  );
}
