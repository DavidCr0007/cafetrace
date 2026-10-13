import {
  ArrowDownRight, ArrowRight, CheckCircle2, CloudSun, Cpu, Database,
  Fingerprint, MapPin, QrCode, ShieldCheck, Sprout,
} from "lucide-react";
import Link from "next/link";
import { checkBackendHealth, getProducts, Product } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { CatalogSection } from "@/components/CatalogSection";

export const dynamic = "force-dynamic";

const sampleProducts: Product[] = [
  {
    id: 1, batch_id: 1, seller_id: null, name: "Café Geisha · muestra de interfaz",
    description: "Producto ilustrativo para revisar el catálogo cuando el modo demo está activado.",
    price: 180000, stock: 45,
    attributes: { category: "coffee", sca_score: 88.5, altitude: 1850, variety: "Geisha", process_method: "Anaeróbico 48h", cup_profile: ["Jazmín", "Durazno", "Miel"] },
    image_url: null, created_at: new Date().toISOString(), updated_at: null,
  },
  {
    id: 2, batch_id: 2, seller_id: null, name: "Chorizo artesanal · muestra de interfaz",
    description: "Referencia ilustrativa para validar productos con control de temperatura.",
    price: 38000, stock: 30,
    attributes: { category: "cured_meats", temperature_control: "2 °C – 4 °C", sanitary_registry: "DEMO-NO-VÁLIDO" },
    image_url: null, created_at: new Date().toISOString(), updated_at: null,
  },
];

const evidenceSteps = [
  { number: "01", title: "Captura en origen", description: "El productor registra el lote y el dispositivo asignado envía mediciones autenticadas.", icon: Cpu },
  { number: "02", title: "Control de calidad", description: "Los datos declarados, instrumentales y auditados se conservan con su procedencia.", icon: Database },
  { number: "03", title: "Huella verificable", description: "Los lotes elegibles generan una huella criptográfica para su notarización.", icon: Fingerprint },
  { number: "04", title: "Consulta transparente", description: "El pasaporte muestra evidencia disponible, ausencias y estado de verificación.", icon: QrCode },
];

export default async function Home() {
  let backendStatus = { online: false, message: "API no disponible", version: undefined as string | undefined };
  try {
    const health = await checkBackendHealth();
    backendStatus = { online: health.status === "online", message: health.message, version: health.version };
  } catch { /* El estado se muestra en la navegación sin bloquear el catálogo. */ }

  const products = backendStatus.online ? await getProducts() : [];
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const displayedProducts = products.length > 0 || !isDemoMode ? products : sampleProducts;
  const isSample = isDemoMode && products.length === 0;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f5ef] text-stone-950 selection:bg-emerald-200">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-stone-950 focus:px-4 focus:py-2 focus:text-white">Saltar al contenido</a>
      <Navbar backendStatus={backendStatus} />

      <div id="contenido">
        <section className="relative border-b border-stone-200/80 px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
          <div aria-hidden="true" className="absolute -right-40 -top-36 h-[34rem] w-[34rem] rounded-full bg-emerald-200/30 blur-3xl" />
          <div aria-hidden="true" className="absolute -left-48 bottom-0 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/15 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900">
                <MapPin className="h-3.5 w-3.5" /> Piloto de café · Icononzo, Tolima
              </div>
              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-stone-950 sm:text-6xl lg:text-7xl">
                Del origen al mercado, con evidencia que puedes revisar.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                CaféTrace conecta lotes, telemetría, calidad y operación comercial en un pasaporte digital. Cada estado distingue lo registrado de lo realmente verificado.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#catalogo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-stone-950/10 transition hover:-translate-y-0.5 hover:bg-stone-800">Explorar catálogo <ArrowDownRight className="h-4 w-4" /></a>
                <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white/70 px-5 py-3.5 text-sm font-bold text-stone-800 transition hover:border-emerald-700 hover:text-emerald-800">Ingresar al dashboard <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-stone-600">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Acceso por roles</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Auditoría operativa</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Datos en COP y hora Colombia</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="rounded-[2rem] border border-white/70 bg-stone-950 p-5 text-white shadow-2xl shadow-stone-950/20 sm:p-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Lectura del lote</p><p className="mt-1 text-lg font-black">Estado de evidencia</p></div><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">Ejemplo visual</span></div>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-400 p-2 text-stone-950"><Sprout className="h-5 w-5" /></span><div><p className="text-sm font-bold">Origen declarado</p><p className="text-xs text-stone-400">Icononzo, Tolima</p></div></div><span className="text-xs font-bold text-emerald-300">Disponible</span></div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-300 p-2 text-stone-950"><CloudSun className="h-5 w-5" /></span><div><p className="text-sm font-bold">Contexto climático</p><p className="text-xs text-stone-400">Pronóstico asociado</p></div></div><span className="text-xs font-bold text-sky-200">Contextual</span></div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-stone-700 p-2 text-stone-200"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-bold">Notarización</p><p className="text-xs text-stone-400">Sujeta a verificación en red</p></div></div><span className="text-xs font-bold text-stone-300">Según el lote</span></div>
                </div>
                <p className="mt-5 text-xs leading-5 text-stone-500">La plataforma no completa evidencia ausente. El pasaporte debe reflejar el estado real informado por la API.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Arquitectura de confianza</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Un flujo claro, sin promesas ocultas.</h2></div><p className="max-w-2xl text-sm leading-6 text-stone-600 lg:justify-self-end">Cada etapa agrega contexto y conserva su procedencia. Una declaración del productor no se presenta como una certificación, y una transacción pendiente no se presenta como confirmada.</p></div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">{evidenceSteps.map(({ number, title, description, icon: Icon }) => <article key={number} className="min-h-64 bg-white p-6 sm:p-7"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon className="h-5 w-5" /></span><span className="text-3xl font-black text-stone-200">{number}</span></div><h3 className="mt-10 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-stone-500">{description}</p></article>)}</div>
          </div>
        </section>

        <div id="catalogo" className="border-y border-stone-200 bg-white pb-20"><CatalogSection products={displayedProducts} isSample={isSample} backendOnline={backendStatus.online} /></div>

        <section className="px-5 py-20 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 overflow-hidden rounded-[2rem] bg-emerald-950 p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Operación por perfiles</p><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Un dashboard distinto para cada responsabilidad.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/70">Administración, contabilidad, ventas, producción, marketing, compra y auditoría comparten datos, pero no permisos.</p></div><Link href="/dashboard" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-200">Abrir dashboard <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-stone-200 bg-stone-950 px-5 py-10 text-stone-400 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-white">CaféTrace</p><p className="mt-1 text-xs">Trazabilidad y operación agroalimentaria.</p></div><div className="flex flex-wrap gap-5 text-xs font-semibold"><Link href="/dashboard" className="hover:text-white">Dashboard</Link><Link href="/admin" className="hover:text-white">Administración</Link><Link href="/trace/1" className="hover:text-white">Consultar lote de demostración</Link></div></div></footer>
    </main>
  );
}
