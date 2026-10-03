"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, BarChart3, Boxes, ClipboardCheck, CloudSun, FileText,
  KeyRound, LogOut, PackageCheck, ShieldCheck, ShoppingCart, Users,
} from "lucide-react";
import {
  AccessProfile, AccountingSummary, AdminSummary, CurrentUser, getAccountingSummary, getAdminSummary, getAuditEvents,
  getCurrentUser, getMyAccess, getProducts, getWeatherForecast, login, UserRole,
} from "@/lib/api";

type DashboardData = AdminSummary & { catalog: number; weather: string; accounting?: AccountingSummary };

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  accountant: "Contador",
  seller: "Vendedor",
  producer: "Productor",
  marketing: "Marketing",
  buyer: "Comprador",
  customer: "Cliente",
  auditor: "Auditor",
};

const roleDescriptions: Record<UserRole, string> = {
  admin: "Control integral de usuarios, operación, seguridad y trazabilidad.",
  accountant: "Seguimiento de pagos, pedidos, conciliación y reportes financieros.",
  seller: "Gestión comercial de catálogo, pedidos, clientes y despachos.",
  producer: "Control de lotes, calidad, sensores IoT y notarización blockchain.",
  marketing: "Lectura de catálogo y trazabilidad para campañas y métricas comerciales.",
  buyer: "Compra directa, pedidos propios y consulta del origen certificado.",
  customer: "Compra directa, pedidos propios y consulta del origen certificado.",
  auditor: "Supervisión de accesos, movimientos, logística y evidencias de auditoría.",
};

const roleModules: Record<UserRole, Array<{ label: string; icon: typeof Boxes }>> = {
  admin: [
    { label: "Usuarios y permisos", icon: Users }, { label: "Contabilidad", icon: FileText },
    { label: "Logística", icon: PackageCheck }, { label: "Blockchain e IoT", icon: ShieldCheck },
    { label: "Auditoría", icon: ClipboardCheck },
  ],
  accountant: [{ label: "Contabilidad", icon: FileText }, { label: "Pedidos", icon: ShoppingCart }, { label: "Reportes", icon: BarChart3 }],
  seller: [{ label: "Catálogo", icon: Boxes }, { label: "Pedidos y clientes", icon: ShoppingCart }, { label: "Despachos", icon: PackageCheck }],
  producer: [{ label: "Lotes y producción", icon: Boxes }, { label: "IoT y clima", icon: CloudSun }, { label: "Blockchain", icon: ShieldCheck }],
  marketing: [{ label: "Catálogo", icon: Boxes }, { label: "Campañas", icon: BarChart3 }, { label: "Trazabilidad pública", icon: ShieldCheck }],
  buyer: [{ label: "Catálogo", icon: ShoppingCart }, { label: "Mis pedidos", icon: PackageCheck }, { label: "Origen certificado", icon: ShieldCheck }],
  customer: [{ label: "Catálogo", icon: ShoppingCart }, { label: "Mis pedidos", icon: PackageCheck }, { label: "Origen certificado", icon: ShieldCheck }],
  auditor: [{ label: "Eventos de auditoría", icon: ClipboardCheck }, { label: "Usuarios", icon: Users }, { label: "Reportes", icon: BarChart3 }],
};

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) {
  return <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><Icon className="h-4 w-4 text-emerald-700" /></div><p className="text-3xl font-black text-stone-950">{value}</p></article>;
}

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { onLogin(await login(email, password)); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo iniciar sesión"); }
  }
  return <form onSubmit={submit} className="mx-auto max-w-md space-y-5 rounded-3xl bg-stone-900 p-8 text-stone-100 shadow-xl"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-400">CaféTrace IA</p><h1 className="mt-2 text-3xl font-black">Acceso al dashboard</h1><p className="mt-2 text-sm text-stone-400">El tablero se adapta a los permisos efectivos de tu cuenta.</p></div><input aria-label="Correo" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@cafetrace.io" className="w-full rounded-xl p-3 text-stone-950" /><input aria-label="Contraseña" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" className="w-full rounded-xl p-3 text-stone-950" /><button className="w-full rounded-xl bg-emerald-400 p-3 font-bold text-stone-950 hover:bg-emerald-300">Ingresar</button>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}</form>;
}

export function RoleDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [access, setAccess] = useState<AccessProfile | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [auditCount, setAuditCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(window.localStorage.getItem("cafetrace_access_token") || window.localStorage.getItem("cafetrace_admin_token"));
  }, []);

  useEffect(() => {
    if (!token) return;
    Promise.all([getCurrentUser(token), getMyAccess(token), getProducts(0, 100)])
      .then(async ([currentUser, profile, products]) => {
        setUser(currentUser); setAccess(profile);
        const base: DashboardData = { users: 0, batches: 0, products: 0, orders: 0, iot_devices: 0, notarized_batches: 0, audit_events: 0, catalog: products.length, weather: "No disponible" };
        if (profile.modules.includes("dashboard.summary.read")) {
          try { Object.assign(base, await getAdminSummary(token)); } catch { /* buyer/customer no tiene dashboard.summary */ }
        }
        if (profile.modules.includes("accounting.read")) {
          try { base.accounting = await getAccountingSummary(token); } catch { /* el dashboard sigue operativo */ }
        }
        if (profile.modules.includes("audit.read")) {
          try { setAuditCount((await getAuditEvents(token)).length); } catch { setAuditCount(0); }
        }
        if (profile.role === "producer" || profile.role === "marketing") {
          try { const weather = await getWeatherForecast(1); base.weather = weather?.hourly[0]?.temperature_c != null ? `${weather.hourly[0].temperature_c} °C` : "Disponible"; } catch { /* no bloquea dashboard */ }
        }
        setData(base);
      })
      .catch((err) => { setError(err instanceof Error ? err.message : "Sesión inválida"); window.localStorage.removeItem("cafetrace_access_token"); window.localStorage.removeItem("cafetrace_admin_token"); setToken(null); });
  }, [token]);

  const role = access?.role || user?.role;
  const modules = useMemo(() => role ? roleModules[role] : [], [role]);

  function logout() { window.localStorage.removeItem("cafetrace_access_token"); window.localStorage.removeItem("cafetrace_admin_token"); setToken(null); setUser(null); setAccess(null); }

  if (!token) return <main className="min-h-screen bg-stone-950 px-6 py-20"><LoginForm onLogin={(newToken) => { window.localStorage.setItem("cafetrace_access_token", newToken); setToken(newToken); }} /></main>;
  if (!user || !access || !role || !data) return <main className="min-h-screen bg-stone-50 p-10 text-center text-stone-600">Cargando permisos y métricas…</main>;

  return <main className="min-h-screen bg-stone-50 px-5 py-8 text-stone-900 sm:px-8"><div className="mx-auto max-w-7xl space-y-8"><header className="flex flex-col gap-5 rounded-3xl bg-stone-950 p-7 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><div className="rounded-2xl bg-emerald-400 p-3 text-stone-950"><Activity className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Dashboard operativo</p><h1 className="text-3xl font-black">Hola, {user.full_name || user.email}</h1></div></div><p className="mt-4 max-w-2xl text-sm text-stone-300">{roleDescriptions[role]}</p></div><div className="flex items-center gap-3"><span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">{roleLabels[role]}</span><button onClick={logout} className="rounded-xl border border-white/20 p-2 text-stone-300 hover:bg-white/10" aria-label="Cerrar sesión"><LogOut className="h-4 w-4" /></button></div></header>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Productos catálogo" value={data.catalog || data.products} icon={Boxes} /><Metric label="Pedidos" value={data.orders} icon={ShoppingCart} /><Metric label="Lotes" value={data.batches} icon={PackageCheck} /><Metric label={role === "producer" ? "Clima Icononzo" : "Eventos auditables"} value={role === "producer" ? data.weather : auditCount ?? data.audit_events} icon={role === "producer" ? CloudSun : ClipboardCheck} /></section>
    <section><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Áreas autorizadas</p><h2 className="text-2xl font-black">Módulos de {roleLabels[role]}</h2></div><Link href="/" className="text-sm font-bold text-emerald-800 hover:underline">Ir al catálogo</Link></div><div className="grid gap-4 md:grid-cols-3">{modules.map(({ label, icon: Icon }) => <article key={label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><Icon className="mb-5 h-6 w-6 text-emerald-700" /><h3 className="font-bold">{label}</h3><p className="mt-2 text-sm text-stone-500">Disponible según los permisos devueltos por la API.</p></article>)}</div></section>
    <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-emerald-700" /><h2 className="font-bold">Permisos efectivos</h2></div><div className="mt-4 flex flex-wrap gap-2">{access.modules.map((permission) => <span key={permission} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{permission}</span>)}</div></article><article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-700" /><h2 className="font-bold">Seguridad de sesión</h2></div><p className="mt-3 text-sm text-stone-600">Cuenta activa, autenticación JWT y permisos verificados nuevamente en el backend para cada operación.</p></article></section>
    {data.accounting && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><div className="mb-4 flex items-center gap-3"><BarChart3 className="h-5 w-5 text-emerald-800" /><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Control financiero</p><h2 className="text-xl font-black">Margen y liquidaciones</h2></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Ventas brutas", data.accounting.gross_sales], ["Pago productores", data.accounting.producer_payout], ["Comisión vendedores", data.accounting.seller_commission], ["Margen CaféTrace", data.accounting.platform_margin]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-white p-4"><p className="text-xs font-semibold text-stone-500">{label}</p><p className="mt-1 text-lg font-black text-stone-900">{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value))}</p></div>)}</div><p className="mt-4 text-xs text-emerald-900">Liquidaciones: {data.accounting.settlements} · Revisión requerida: {data.accounting.review_required}</p></section>}
    {error && <p role="alert" className="text-red-700">{error}</p>}</div></main>;
}
