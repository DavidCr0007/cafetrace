import Link from "next/link";
import { ArrowLeft, Database, Server, TerminalSquare } from "lucide-react";
import { RuntimeRig } from "@/components/diagnostics/RuntimeRig";

export const metadata = {
  title: "Diagnóstico local — CaféTrace",
  description: "Comprobación de comunicación entre el frontend, FastAPI y PostgreSQL.",
};

const steps = [
  { icon: Database, title: "1. PostgreSQL", command: "./ops/dev-db.sh start", detail: "Desde la raíz del repositorio; escucha de forma aislada en 127.0.0.1:55432." },
  { icon: Server, title: "2. Backend", command: "cd backend && source ../.venv/bin/activate && alembic upgrade head && uvicorn app.main:app --reload", detail: "La disponibilidad completa se comprueba en http://localhost:8000/health/ready." },
  { icon: TerminalSquare, title: "3. Frontend", command: "cd frontend && npm run dev", detail: "NEXT_PUBLIC_API_URL debe apuntar a http://localhost:8000/api/v1." },
];

export default function DiagnosticsPage() {
  return (
    <main className="min-h-screen bg-[#f2f2ef] px-5 py-10 text-stone-950 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-stone-600 transition hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Diagnóstico de ejecución local</p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Encuentra la frontera que no está respondiendo.</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-stone-600 lg:justify-self-end">
            Esta prueba no se limita a confirmar que el proceso HTTP está vivo: valida que FastAPI puede abrir una conexión real con PostgreSQL antes de declarar el catálogo disponible.
          </p>
        </div>

        <section className="mt-10" aria-labelledby="rig-title">
          <h2 id="rig-title" className="sr-only">Banco de comunicación local</h2>
          <RuntimeRig />
        </section>

        <section className="mt-12" aria-labelledby="startup-title">
          <h2 id="startup-title" className="text-xl font-black">Orden de arranque reproducible</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {steps.map(({ icon: Icon, title, command, detail }) => (
              <article key={title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="h-5 w-5" /></span><h3 className="font-black">{title}</h3></div>
                <code className="mt-5 block overflow-x-auto rounded-xl bg-stone-950 p-3 text-[11px] leading-5 text-emerald-200">{command}</code>
                <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
