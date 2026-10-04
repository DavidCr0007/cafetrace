"use client";

import { FormEvent, useEffect, useState } from "react";
import { getAdminSummary, getAuditEvents, login, AdminSummary } from "@/lib/api";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [events, setEvents] = useState<Array<Record<string, any>>>([]);
  const [error, setError] = useState("");

  useEffect(() => { setToken(window.localStorage.getItem("cafetrace_admin_token")); }, []);
  useEffect(() => {
    if (!token) return;
    Promise.all([getAdminSummary(token), getAuditEvents(token)])
      .then(([data, audit]) => { setSummary(data); setEvents(audit); })
      .catch((err) => { setError(err.message); window.localStorage.removeItem("cafetrace_admin_token"); setToken(null); });
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { const newToken = await login(email, password); window.localStorage.setItem("cafetrace_admin_token", newToken); setToken(newToken); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo iniciar sesión"); }
  }

  if (!token) return <main className="min-h-screen bg-stone-950 px-6 py-20 text-stone-100"><form onSubmit={submit} className="mx-auto max-w-md space-y-5 rounded-3xl bg-stone-900 p-8"><h1 className="text-3xl font-black">Panel administrativo</h1><p className="text-sm text-stone-400">Acceso restringido a usuarios con rol admin.</p><input aria-label="Correo" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@cafetrace.co" className="w-full rounded-xl p-3 text-stone-900" /><input aria-label="Contraseña" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="w-full rounded-xl p-3 text-stone-900" /><button className="w-full rounded-xl bg-emerald-500 p-3 font-bold text-stone-950">Ingresar</button>{error && <p role="alert" className="text-red-300">{error}</p>}</form></main>;

  return <main className="min-h-screen bg-stone-50 px-6 py-12 text-stone-900"><div className="mx-auto max-w-6xl space-y-8"><div className="flex items-center justify-between"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">CaféTrace IA</p><h1 className="text-4xl font-black">Operación y auditoría</h1></div><button onClick={() => { window.localStorage.removeItem("cafetrace_admin_token"); setToken(null); }} className="rounded-xl border px-4 py-2">Cerrar sesión</button></div>{summary && <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(summary).map(([key, value]) => <article key={key} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs uppercase text-stone-500">{key.replaceAll("_", " ")}</p><p className="text-3xl font-black">{String(value)}</p></article>)}</section>}<section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold">Eventos recientes</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Fecha</th><th className="p-2">Acción</th><th className="p-2">Recurso</th><th className="p-2">Metadatos</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b"><td className="p-2">{String(event.timestamp ?? "")}</td><td className="p-2 font-semibold">{String(event.action ?? "")}</td><td className="p-2">{String(event.resource_type ?? "")} / {String(event.resource_id ?? "—")}</td><td className="max-w-xs truncate p-2">{JSON.stringify(event.metadata)}</td></tr>)}</tbody></table></div></section>{error && <p role="alert" className="text-red-700">{error}</p>}</div></main>;
}
