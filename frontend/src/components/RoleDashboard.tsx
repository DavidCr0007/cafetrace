"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, BarChart3, Boxes, ChevronRight, ClipboardCheck, CloudSun,
  FileText, Home, KeyRound, LayoutDashboard, Loader2, LockKeyhole,
  LogOut, PackageCheck, PencilLine, ShieldCheck, ShoppingCart, UserRound, Users,
} from "lucide-react";
import {
  AccessMatrix, AccessProfile, AccountingSummary, AdminSummary, AuditEvent, CurrentUser,
  getAccessMatrix, getAccountingSummary, getAdminSummary, getAuditEvents, getCurrentUser,
  getMyAccess, getPasswordResetRequests, getProducts, getUsers, getWeatherForecast,
  login, logoutSession, PasswordResetRequest, updateCurrentUser, UserRole,
} from "@/lib/api";
import { ROLE_LABELS } from "@/lib/access";
import { UserManagementPanel } from "@/components/UserManagementPanel";
import { IoTPanel, LogisticsPanel, OrdersPanel, ProductsPanel, TraceabilityPanel } from "@/components/dashboard/OperationsPanels";

type SectionId = "overview" | "modules" | "profile" | "users" | "audit" | "accounting" | "products" | "orders" | "logistics" | "traceability" | "iot";
type DashboardData = AdminSummary & { catalog: number; weather: string; accounting?: AccountingSummary };

const emptySummary: DashboardData = {
  users: 0, batches: 0, products: 0, orders: 0, iot_devices: 0,
  notarized_batches: 0, audit_events: 0, catalog: 0, weather: "No disponible",
};

const roleDescriptions: Record<UserRole, string> = {
  admin: "Supervisión integral de usuarios, operación, seguridad y trazabilidad.",
  accountant: "Control de liquidaciones, márgenes, nómina y conciliación.",
  seller: "Seguimiento comercial de catálogo, pedidos, clientes y despachos.",
  producer: "Gestión de lotes, calidad, telemetría IoT y notarización.",
  marketing: "Lectura del catálogo y trazabilidad para campañas verificables.",
  buyer: "Compra directa y consulta del origen de cada producto.",
  auditor: "Revisión independiente de accesos, movimientos y evidencias.",
};

const moduleCatalog = [
  { permission: "users.read", label: "Usuarios", description: "Consulta perfiles, roles y estados de acceso.", icon: Users, section: "users" as SectionId },
  { permission: "users.manage", label: "Control de acceso", description: "Administra roles, activación y códigos temporales.", icon: KeyRound, section: "users" as SectionId },
  { permission: "password_reset.approve", label: "Recuperación de cuentas", description: "Revisa y aprueba solicitudes de restablecimiento con trazabilidad.", icon: LockKeyhole, section: "users" as SectionId },
  { permission: "accounting.read", label: "Contabilidad", description: "Revisa ventas, pagos, comisiones y margen operativo.", icon: FileText, section: "accounting" as SectionId },
  { permission: "accounting.write", label: "Liquidaciones", description: "Gestiona reglas, pagos, salarios y distribución de márgenes.", icon: PencilLine, section: "accounting" as SectionId },
  { permission: "logistics.read", label: "Logística", description: "Consulta pedidos, despachos y cadena de frío.", icon: PackageCheck, section: "logistics" as SectionId },
  { permission: "logistics.write", label: "Operación logística", description: "Actualiza despachos, entregas y controles de cadena de frío.", icon: PackageCheck, section: "logistics" as SectionId },
  { permission: "traceability.read", label: "Trazabilidad", description: "Consulta lotes, registros y evidencia de origen.", icon: ShieldCheck, section: "traceability" as SectionId },
  { permission: "traceability.write", label: "Producción e IoT", description: "Registra evidencia operativa sobre lotes autorizados.", icon: CloudSun, section: "iot" as SectionId },
  { permission: "blockchain.notarize", label: "Blockchain", description: "Notariza lotes elegibles y verifica su integridad.", icon: LockKeyhole },
  { permission: "catalog.read", label: "Catálogo", description: "Consulta la oferta publicada y su disponibilidad.", icon: Boxes, href: "/" },
  { permission: "catalog.write", label: "Gestión de catálogo", description: "Prepara productos asociados a lotes autorizados.", icon: PencilLine, section: "products" as SectionId },
  { permission: "orders.read", label: "Pedidos", description: "Consulta órdenes según el ámbito de tu rol.", icon: ShoppingCart, section: "orders" as SectionId },
  { permission: "orders.write", label: "Gestión de pedidos", description: "Actualiza el ciclo operativo de órdenes autorizadas.", icon: ShoppingCart, section: "orders" as SectionId },
  { permission: "audit.read", label: "Auditoría", description: "Revisa eventos, actores y recursos modificados.", icon: ClipboardCheck, section: "audit" as SectionId },
  { permission: "reports.read", label: "Reportes", description: "Accede a indicadores operativos y financieros.", icon: BarChart3 },
  { permission: "marketing.write", label: "Marketing", description: "Gestiona información comercial y campañas con origen verificable.", icon: BarChart3 },
  { permission: "profile.write", label: "Perfil", description: "Actualiza la información y credenciales de la cuenta propia.", icon: UserRound, section: "profile" as SectionId },
];

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

function Metric({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: typeof Activity; hint?: string }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</span>
        <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="text-3xl font-black tracking-tight text-stone-950">{value}</p>
      {hint && <p className="mt-2 text-xs text-stone-500">{hint}</p>}
    </article>
  );
}

function LoginForm({ onLogin, adminOnly }: { onLogin: (token: string) => void; adminOnly: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try { onLogin(await login(email.trim(), password)); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo iniciar sesión"); }
    finally { setLoading(false); }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-950 px-5 py-12 text-stone-100">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-400 hover:text-white"><Home className="h-4 w-4" /> Volver al inicio</Link>
        <form onSubmit={submit} className="space-y-6 rounded-[2rem] border border-white/10 bg-stone-900 p-7 shadow-2xl sm:p-9">
          <div>
            <div className="mb-5 inline-flex rounded-2xl bg-emerald-400 p-3 text-stone-950"><ShieldCheck className="h-6 w-6" /></div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">CaféTrace · acceso seguro</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{adminOnly ? "Panel administrativo" : "Tu espacio de trabajo"}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-400">{adminOnly ? "Este acceso valida que la cuenta tenga rol administrador." : "Los módulos se habilitan con los permisos efectivos de tu cuenta."}</p>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-semibold" htmlFor="dashboard-email">Correo electrónico</label>
            <input id="dashboard-email" required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@cafetrace.io" className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition placeholder:text-stone-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" />
            <label className="block text-sm font-semibold" htmlFor="dashboard-password">Contraseña</label>
            <input id="dashboard-password" required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition placeholder:text-stone-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" />
          </div>
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 p-3.5 font-bold text-stone-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Validando…" : "Ingresar"}
          </button>
          {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        </form>
      </div>
    </main>
  );
}

function ProfilePanel({ token, user, onUpdated }: { token: string; user: CurrentUser; onUpdated: (user: CurrentUser) => void }) {
  const [fullName, setFullName] = useState(user.full_name || "");
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage("");
    try {
      const updated = await updateCurrentUser(token, { full_name: fullName.trim(), email: email.trim(), ...(password ? { password } : {}) });
      onUpdated(updated); setPassword(""); setMessage("Perfil actualizado correctamente.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "No se pudo actualizar el perfil"); }
    finally { setSaving(false); }
  }

  return (
    <section aria-labelledby="profile-title" className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <form onSubmit={save} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Cuenta personal</p>
        <h2 id="profile-title" className="mt-1 text-2xl font-black">Información del perfil</h2>
        <p className="mt-2 text-sm text-stone-500">Actualiza tus datos. El cambio quedará registrado en la auditoría del sistema.</p>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-stone-700">Nombre completo<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="text-sm font-semibold text-stone-700">Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="text-sm font-semibold text-stone-700 sm:col-span-2">Nueva contraseña <span className="font-normal text-stone-400">(opcional, mínimo 12 caracteres)</span><input minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Déjala vacía para conservar la actual" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4"><button disabled={saving} className="rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-60">{saving ? "Guardando…" : "Guardar cambios"}</button>{message && <p role="status" className="text-sm text-stone-600">{message}</p>}</div>
      </form>
      <aside className="rounded-3xl bg-emerald-950 p-6 text-emerald-50 shadow-sm sm:p-8">
        <UserRound className="h-8 w-8 text-emerald-300" />
        <h3 className="mt-5 text-xl font-black">{ROLE_LABELS[user.role]}</h3>
        <p className="mt-2 text-sm leading-6 text-emerald-100/70">{roleDescriptions[user.role]}</p>
        <dl className="mt-7 space-y-4 border-t border-white/10 pt-5 text-sm"><div><dt className="text-emerald-200/60">Estado</dt><dd className="mt-1 font-bold">{user.is_active ? "Cuenta activa" : "Cuenta inactiva"}</dd></div><div><dt className="text-emerald-200/60">Miembro desde</dt><dd className="mt-1 font-bold">{dateTime.format(new Date(user.created_at))}</dd></div></dl>
      </aside>
    </section>
  );
}

export function RoleDashboard({ requiredRole }: { requiredRole?: UserRole }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [access, setAccess] = useState<AccessProfile | null>(null);
  const [data, setData] = useState<DashboardData>(emptySummary);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix | null>(null);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sessionToken = window.sessionStorage.getItem("cafetrace_access_token");
    const legacyToken = window.localStorage.getItem("cafetrace_access_token") || window.localStorage.getItem("cafetrace_admin_token");
    if (!sessionToken && legacyToken) window.sessionStorage.setItem("cafetrace_access_token", legacyToken);
    window.localStorage.removeItem("cafetrace_access_token");
    window.localStorage.removeItem("cafetrace_admin_token");
    // La sesión solo existe en el navegador y debe hidratarse después del montaje.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(sessionToken || legacyToken);
  }, []);

  useEffect(() => {
    function receiveRefreshedToken(event: Event) {
      setToken((event as CustomEvent<string>).detail);
    }
    window.addEventListener("cafetrace-token-refreshed", receiveRefreshedToken);
    return () => window.removeEventListener("cafetrace-token-refreshed", receiveRefreshedToken);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([getCurrentUser(token), getMyAccess(token), getProducts(0, 100)])
      .then(async ([currentUser, profile, products]) => {
        if (cancelled) return;
        setUser(currentUser); setAccess(profile);
        const next: DashboardData = { ...emptySummary, catalog: products.length };
        if (profile.modules.includes("users.read")) {
          try { setUsers(await getUsers(token)); }
          catch (err) { setError(err instanceof Error ? `Usuarios: ${err.message}` : "No se pudo cargar el listado de usuarios"); }
        }
        if (profile.role === "admin") {
          try { setAccessMatrix(await getAccessMatrix(token)); }
          catch (err) { setError(err instanceof Error ? `Matriz de acceso: ${err.message}` : "No se pudo cargar la matriz de acceso"); }
        }
        const jobs: Promise<void>[] = [];
        if (profile.modules.includes("dashboard.summary.read")) jobs.push(getAdminSummary(token).then((summary) => { Object.assign(next, summary); }).catch(() => undefined));
        if (profile.modules.includes("accounting.read")) jobs.push(getAccountingSummary(token).then((accounting) => { next.accounting = accounting; }).catch(() => undefined));
        if (profile.modules.includes("audit.read")) jobs.push(getAuditEvents(token).then(setEvents).catch(() => setEvents([])));
        if (profile.role === "admin") jobs.push(getPasswordResetRequests(token).then(setResetRequests).catch(() => setResetRequests([])));
        if (["producer", "marketing"].includes(profile.role)) jobs.push(getWeatherForecast(1).then((forecast) => { next.weather = forecast?.hourly[0]?.temperature_c != null ? `${forecast.hourly[0].temperature_c} °C` : "Disponible"; }).catch(() => undefined));
        await Promise.all(jobs);
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "La sesión no es válida");
        window.sessionStorage.removeItem("cafetrace_access_token"); setToken(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const role = access?.role || user?.role;
  const modules = useMemo(() => moduleCatalog.filter((item) => access?.modules.includes(item.permission)), [access]);
  const nav = useMemo(() => {
    const items = [
      { id: "overview" as SectionId, label: "Resumen", icon: LayoutDashboard, show: true },
      { id: "modules" as SectionId, label: "Módulos", icon: Boxes, show: true },
      { id: "accounting" as SectionId, label: "Finanzas", icon: BarChart3, show: Boolean(access?.modules.includes("accounting.read")) },
      { id: "products" as SectionId, label: "Productos", icon: Boxes, show: Boolean(access?.modules.includes("catalog.write")) },
      { id: "orders" as SectionId, label: "Pedidos", icon: ShoppingCart, show: Boolean(access?.modules.includes("orders.read")) },
      { id: "logistics" as SectionId, label: "Logística", icon: PackageCheck, show: Boolean(access?.modules.includes("logistics.read")) },
      { id: "traceability" as SectionId, label: "Trazabilidad", icon: ShieldCheck, show: Boolean(access?.modules.includes("traceability.read")) },
      { id: "iot" as SectionId, label: "IoT", icon: CloudSun, show: Boolean(access?.modules.includes("traceability.write")) },
      { id: "users" as SectionId, label: "Usuarios", icon: Users, show: Boolean(access?.modules.includes("users.read")) },
      { id: "audit" as SectionId, label: "Auditoría", icon: ClipboardCheck, show: Boolean(access?.modules.includes("audit.read")) },
      { id: "profile" as SectionId, label: "Mi perfil", icon: UserRound, show: true },
    ];
    return items.filter((item) => item.show);
  }, [access]);

  function acceptToken(newToken: string) { window.sessionStorage.setItem("cafetrace_access_token", newToken); setToken(newToken); }
  async function logout() {
    try { await logoutSession(); } catch { /* La sesión local siempre debe cerrarse. */ }
    window.sessionStorage.removeItem("cafetrace_access_token");
    setToken(null); setUser(null); setAccess(null); setAccessMatrix(null); setUsers([]); setEvents([]); setResetRequests([]); setData(emptySummary); setError(""); setActiveSection("overview");
  }

  if (token === undefined) return <main className="grid min-h-screen place-items-center bg-stone-950 text-stone-300"><Loader2 className="h-7 w-7 animate-spin" /><span className="sr-only">Cargando sesión</span></main>;
  if (!token) return <LoginForm adminOnly={requiredRole === "admin"} onLogin={acceptToken} />;
  if (loading || !user || !access || !role) return <main className="grid min-h-screen place-items-center bg-stone-50 text-stone-600"><div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-emerald-700" /> Cargando permisos y métricas…</div></main>;
  if (requiredRole && role !== requiredRole) return <main className="grid min-h-screen place-items-center bg-stone-50 px-5"><div className="max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm"><LockKeyhole className="mx-auto h-9 w-9 text-amber-700" /><h1 className="mt-4 text-2xl font-black">Acceso restringido</h1><p className="mt-2 text-sm text-stone-600">Tu perfil es {ROLE_LABELS[role]}. Este espacio requiere rol {ROLE_LABELS[requiredRole]}.</p><div className="mt-6 flex justify-center gap-3"><Link href="/dashboard" className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-bold text-white">Ir a mi dashboard</Link><button onClick={logout} className="rounded-xl border px-4 py-2 text-sm font-bold">Salir</button></div></div></main>;

  return (
    <main className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col bg-stone-950 px-4 py-6 text-white lg:flex">
          <Link href="/" className="flex items-center gap-3 px-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 font-black text-stone-950">CT</span><div><p className="font-black">CaféTrace</p><p className="text-[11px] text-stone-400">Centro operativo</p></div></Link>
          <nav aria-label="Navegación del dashboard" className="mt-10 space-y-1">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveSection(id)} aria-current={activeSection === id ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activeSection === id ? "bg-emerald-400 text-stone-950" : "text-stone-400 hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-stone-500">Sesión activa como</p><p className="mt-1 truncate text-sm font-bold">{user.email}</p><button onClick={logout} className="mt-4 flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white"><LogOut className="h-4 w-4" /> Cerrar sesión</button></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 px-5 py-4 backdrop-blur-md sm:px-8">
            <div className="flex min-w-0 items-center justify-between gap-4"><div className="min-w-0"><p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{ROLE_LABELS[role]}</p><h1 className="truncate text-xl font-black sm:text-2xl">Hola, {user.full_name || user.email.split("@")[0]}</h1></div><div className="flex shrink-0 items-center gap-2"><Link href="/" className="rounded-xl border border-stone-200 p-2.5 text-stone-600 hover:bg-stone-50" aria-label="Ir al inicio"><Home className="h-4 w-4" /></Link><button onClick={logout} className="rounded-xl border border-stone-200 p-2.5 text-stone-600 hover:bg-stone-50 lg:hidden" aria-label="Cerrar sesión"><LogOut className="h-4 w-4" /></button></div></div>
            <nav aria-label="Secciones del dashboard" className="-mx-1 mt-4 flex gap-1 overflow-x-auto pb-1 lg:hidden">{nav.map(({ id, label }) => <button key={id} onClick={() => setActiveSection(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${activeSection === id ? "bg-stone-950 text-white" : "text-stone-500"}`}>{label}</button>)}</nav>
          </header>

          <div className="p-5 sm:p-8 lg:p-10">
            {error && <div role="alert" className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button onClick={() => setError("")} className="font-bold">Cerrar</button></div>}

            {activeSection === "overview" && <div className="space-y-8"><section className="overflow-hidden rounded-[2rem] bg-emerald-950 p-7 text-white shadow-lg sm:p-9"><div className="max-w-3xl"><span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">Permisos sincronizados</span><h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Tu operación, en contexto.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/70">{roleDescriptions[role]} Cada acción sensible vuelve a validarse en la API.</p></div></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Productos visibles" value={data.catalog || data.products} icon={Boxes} hint="Catálogo disponible" /><Metric label="Pedidos" value={data.orders} icon={ShoppingCart} hint={access.modules.includes("orders.read") ? "Según tu ámbito" : "Sin permiso de lectura"} /><Metric label="Lotes" value={data.batches} icon={PackageCheck} hint={`${data.notarized_batches} con registro confirmado`} /><Metric label={role === "producer" ? "Clima Icononzo" : "Actividad auditable"} value={role === "producer" ? data.weather : events.length || data.audit_events} icon={role === "producer" ? CloudSun : ClipboardCheck} hint={role === "producer" ? "Pronóstico contextual" : "Eventos disponibles"} /></section><section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]"><div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Acceso efectivo</p><h2 className="mt-1 text-xl font-black">Módulos habilitados</h2></div><button onClick={() => setActiveSection("modules")} className="text-sm font-bold text-emerald-800">Ver todos</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{modules.slice(0, 4).map(({ permission, label, icon: Icon }) => <div key={permission} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3"><span className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm"><Icon className="h-4 w-4" /></span><span className="text-sm font-bold">{label}</span></div>)}</div></div><button onClick={() => setActiveSection("profile")} className="group rounded-3xl border border-stone-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-300"><UserRound className="h-6 w-6 text-emerald-700" /><h2 className="mt-5 text-xl font-black">Tu perfil</h2><p className="mt-2 text-sm text-stone-500">Revisa tus datos y actualiza tus credenciales.</p><span className="mt-5 flex items-center gap-1 text-sm font-bold text-emerald-800">Administrar <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></button></section></div>}

            {activeSection === "modules" && <section><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Permisos efectivos</p><h2 className="mt-1 text-3xl font-black">Módulos de {ROLE_LABELS[role]}</h2><p className="mt-2 max-w-2xl text-sm text-stone-500">{modules.length} capacidades operativas visibles de {access.modules.length} permisos concedidos por el backend. “Panel operativo” indica una sección administrable; “API disponible” confirma backend sin interfaz de gestión todavía.</p><div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{modules.map(({ permission, label, description, icon: Icon, section, href }) => { const status = section ? "Panel operativo" : href ? "Vista disponible" : "API disponible"; const content = <><div className="flex items-start justify-between gap-3"><span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><Icon className="h-5 w-5" /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${section || href ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{status}</span></div><h3 className="mt-5 text-lg font-black">{label}</h3><p className="mt-2 text-sm leading-6 text-stone-500">{description}</p><code className="mt-4 block text-[10px] text-stone-400">{permission}</code></>; if (href) return <Link key={permission} href={href} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">{content}</Link>; if (section) return <button key={permission} onClick={() => setActiveSection(section)} className="rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">{content}</button>; return <article key={permission} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">{content}</article>; })}</div></section>}

            {activeSection === "profile" && <ProfilePanel token={token} user={user} onUpdated={setUser} />}

            {activeSection === "accounting" && <section><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Control financiero</p><h2 className="mt-1 text-3xl font-black">Margen y liquidaciones</h2>{data.accounting ? <><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Ventas brutas" value={money.format(data.accounting.gross_sales)} icon={ShoppingCart} /><Metric label="Pago productores" value={money.format(data.accounting.producer_payout)} icon={PackageCheck} /><Metric label="Comisión vendedores" value={money.format(data.accounting.seller_commission)} icon={Users} /><Metric label="Margen CaféTrace" value={money.format(data.accounting.platform_margin)} icon={BarChart3} /></div><div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600"><strong className="text-stone-950">{data.accounting.settlements}</strong> liquidaciones registradas · <strong className="text-amber-700">{data.accounting.review_required}</strong> requieren revisión.</div></> : <div className="mt-7 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No hay información contable disponible.</div>}</section>}

            {activeSection === "products" && <ProductsPanel token={token} user={user} onError={setError} />}
            {activeSection === "orders" && <OrdersPanel token={token} user={user} onError={setError} />}
            {activeSection === "logistics" && <LogisticsPanel token={token} user={user} onError={setError} />}
            {activeSection === "traceability" && <TraceabilityPanel token={token} user={user} users={users} onError={setError} />}
            {activeSection === "iot" && <IoTPanel token={token} user={user} onError={setError} />}

            {activeSection === "users" && <UserManagementPanel token={token} currentUserId={user.id} users={users} accessMatrix={accessMatrix} canManage={access.modules.includes("users.manage")} pendingResetCount={resetRequests.filter((item) => item.status === "pending").length} onUsersChange={(nextUsers) => { setUsers(nextUsers); setData((current) => ({ ...current, users: nextUsers.length })); }} onError={setError} />}

            {activeSection === "audit" && <section><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Evidencia operativa</p><h2 className="mt-1 text-3xl font-black">Eventos de auditoría</h2><p className="mt-2 text-sm text-stone-500">Últimos {events.length} movimientos visibles.</p><div className="mt-7 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Acción</th><th className="px-5 py-4">Recurso</th><th className="px-5 py-4">Actor</th></tr></thead><tbody className="divide-y divide-stone-100">{events.map((event) => <tr key={event.id}><td className="whitespace-nowrap px-5 py-4 text-stone-500">{dateTime.format(new Date(event.timestamp))}</td><td className="px-5 py-4 font-bold">{event.action}</td><td className="px-5 py-4 text-stone-600">{event.resource_type} / {event.resource_id || "—"}</td><td className="px-5 py-4 text-stone-600">{event.actor_user_id || "Sistema"}</td></tr>)}</tbody></table></div>{events.length === 0 && <p className="p-8 text-center text-sm text-stone-500">No hay eventos para mostrar.</p>}</div></section>}
          </div>
        </div>
      </div>
    </main>
  );
}
