"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Batch, createBatch, createProduct, createTraceabilityRecord, CurrentUser,
  getAccessibleProducts, getBatches, getCatalogBatches, getIoTDevices, getOrders,
  IoTDevice, OrderResponse, Product, registerIoTDevice, updateOrderStatus,
  updateProduct, updateShipment,
} from "@/lib/api";

type CommonProps = { token: string; user: CurrentUser; onError: (message: string) => void; users?: CurrentUser[] };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "La operación no pudo completarse";
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">{children}</p>;
}

export function ProductsPanel({ token, user, onError }: CommonProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ batch_id: "", name: "", price: "", stock: "0" });
  const load = useCallback(async () => {
    try {
      const [nextProducts, nextBatches] = await Promise.all([getAccessibleProducts(token), getCatalogBatches(token)]);
      setProducts(nextProducts); setBatches(nextBatches);
    } catch (error) { onError(errorMessage(error)); }
  }, [onError, token]);
  // La carga sincroniza estado con una API externa y solo actualiza después del await.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      await createProduct(token, { batch_id: Number(form.batch_id), name: form.name.trim(), price: Number(form.price), stock: Number(form.stock), attributes: { category: "coffee" } });
      setForm({ batch_id: "", name: "", price: "", stock: "0" }); setMessage("Producto creado y auditado."); await load();
    } catch (error) { onError(errorMessage(error)); } finally { setSaving(false); }
  }

  async function replenish(product: Product) {
    try { await updateProduct(token, product.id, { stock: product.stock + 1 }); setMessage(`Stock de ${product.name} actualizado.`); await load(); }
    catch (error) { onError(errorMessage(error)); }
  }

  return <section aria-labelledby="products-title" className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Catálogo operativo</p><h2 id="products-title" className="mt-1 text-3xl font-black">Productos bajo tu ámbito</h2><p className="mt-2 text-sm text-stone-500">{user.role === "seller" ? "Solo lotes asignados comercialmente." : "Productos vinculados a lotes autorizados."}</p></div>
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-4">
      <label className="text-sm font-semibold">Lote<select required value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} className="mt-2 w-full rounded-xl border p-3"><option value="">Selecciona</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>Lote #{batch.id} · {batch.status}</option>)}</select></label>
      <label className="text-sm font-semibold">Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="text-sm font-semibold">Precio COP<input required min="0" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="text-sm font-semibold">Stock<input required min="0" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
      <button disabled={saving || batches.length === 0} className="rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white md:col-span-4 disabled:opacity-50">{saving ? "Guardando…" : "Crear producto"}</button>
      {batches.length === 0 && <p role="status" className="text-sm text-amber-700 md:col-span-4">No hay lotes asignados disponibles para crear productos.</p>}
    </form>
    {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
    {products.length === 0 ? <Empty>No hay productos administrables.</Empty> : <div className="grid gap-3">{products.map((product) => <article key={product.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5"><div><h3 className="font-black">{product.name}</h3><p className="text-sm text-stone-500">Lote #{product.batch_id} · Stock {product.stock} · ${product.price.toLocaleString("es-CO")}</p></div><button onClick={() => replenish(product)} className="rounded-xl border px-4 py-2 text-sm font-bold">Reponer +1</button></article>)}</div>}
  </section>;
}

export function OrdersPanel({ token, user, onError }: CommonProps) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { setOrders(await getOrders(token)); } catch (error) { onError(errorMessage(error)); } }, [onError, token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  async function changeStatus(order: OrderResponse, status: string) {
    try { await updateOrderStatus(token, order.id, status); setMessage(`Pedido #${order.id} actualizado.`); await load(); } catch (error) { onError(errorMessage(error)); }
  }
  const canUpdate = user.role === "admin" || user.role === "seller";
  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Ámbito comercial</p><h2 className="mt-1 text-3xl font-black">Pedidos autorizados</h2></div>{message && <p role="status" className="text-sm text-emerald-800">{message}</p>}{orders.length === 0 ? <Empty>No hay pedidos visibles para este perfil.</Empty> : <div className="grid gap-3">{orders.map((order) => <article key={order.id} className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_auto]"><div><h3 className="font-black">Pedido #{order.id} · {order.customer_name}</h3><p className="text-sm text-stone-500">{order.city} · ${order.total_amount.toLocaleString("es-CO")} · {order.status}</p></div>{canUpdate ? <select aria-label={`Estado del pedido ${order.id}`} value={order.status} onChange={(event) => void changeStatus(order, event.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="confirmed">Confirmado</option><option value="processing">En preparación</option><option value="shipped">Despachado</option><option value="delivered">Entregado</option><option value="cancelled">Cancelado</option></select> : <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-bold uppercase">Solo lectura</span>}</article>)}</div>}</section>;
}

export function LogisticsPanel({ token, user, onError }: CommonProps) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [form, setForm] = useState({ orderId: "", carrier: "", tracking: "", status: "packed", cold: false });
  const [message, setMessage] = useState("");
  useEffect(() => { getOrders(token).then(setOrders).catch((error) => onError(errorMessage(error))); }, [onError, token]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("¿Confirmas la actualización logística y su registro de auditoría?")) return;
    try { await updateShipment(token, Number(form.orderId), { carrier: form.carrier, tracking_number: form.tracking, status: form.status, cold_chain_required: form.cold }); setMessage("Despacho actualizado y auditado."); }
    catch (error) { onError(errorMessage(error)); }
  }
  const canWrite = user.role === "admin" || user.role === "seller";
  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Cadena de suministro</p><h2 className="mt-1 text-3xl font-black">Operación logística</h2><p className="mt-2 text-sm text-stone-500">{user.role === "seller" ? "Pedidos asignados a tu cuenta." : "Seguimiento global autorizado."}</p></div>{canWrite ? <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-2"><label className="text-sm font-semibold">Pedido<select required value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="mt-2 w-full rounded-xl border p-3"><option value="">Selecciona</option>{orders.map((order) => <option key={order.id} value={order.id}>#{order.id} · {order.customer_name}</option>)}</select></label><label className="text-sm font-semibold">Transportadora<input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label><label className="text-sm font-semibold">Guía<input value={form.tracking} onChange={(e) => setForm({ ...form, tracking: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label><label className="text-sm font-semibold">Estado<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border p-3"><option value="packed">Empacado</option><option value="in_transit">En tránsito</option><option value="delivered">Entregado</option><option value="exception">Novedad</option></select></label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.cold} onChange={(e) => setForm({ ...form, cold: e.target.checked })} /> Requiere cadena de frío</label><button className="rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white">Guardar despacho</button></form> : <div className="rounded-2xl border border-dashed p-6 text-sm text-stone-500">Perfil de consulta: {orders.length} pedidos visibles, sin capacidad de modificar despachos.</div>}{message && <p role="status" className="text-sm text-emerald-800">{message}</p>}</section>;
}

export function TraceabilityPanel({ token, user, onError, users = [] }: CommonProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [message, setMessage] = useState("");
  const [record, setRecord] = useState({ batchId: "", stage: "", note: "" });
  const [producerId, setProducerId] = useState(user.role === "producer" ? String(user.id) : "");
  const load = useCallback(async () => { try { setBatches(await getBatches(token)); } catch (error) { onError(errorMessage(error)); } }, [onError, token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  async function addBatch() {
    try { await createBatch(token, { producer_id: Number(producerId), status: "harvested", details: { origin: "Icononzo, Tolima" } }); setMessage("Lote creado y auditado."); await load(); } catch (error) { onError(errorMessage(error)); }
  }
  async function addRecord(event: FormEvent) {
    event.preventDefault();
    try { await createTraceabilityRecord(token, Number(record.batchId), { record_type: "manual", data: { stage: record.stage, note: record.note } }); setRecord({ batchId: "", stage: "", note: "" }); setMessage("Registro de trazabilidad agregado."); } catch (error) { onError(errorMessage(error)); }
  }
  const canWrite = user.role === "admin" || user.role === "producer";
  const producers = users.filter((candidate) => candidate.role === "producer" && candidate.is_active);
  return <section className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Origen y evidencia</p><h2 className="mt-1 text-3xl font-black">Lotes trazables</h2></div>{canWrite && <div className="flex flex-wrap items-end gap-2">{user.role === "admin" && <label className="text-xs font-bold">Productor<select aria-label="Productor del nuevo lote" value={producerId} onChange={(event) => setProducerId(event.target.value)} className="mt-1 block rounded-xl border bg-white px-3 py-2 text-sm font-normal"><option value="">Selecciona</option>{producers.map((producer) => <option key={producer.id} value={producer.id}>{producer.full_name || producer.email}</option>)}</select></label>}<button disabled={!producerId} onClick={() => void addBatch()} className="rounded-xl bg-stone-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Crear lote de Icononzo</button></div>}</div>{canWrite && <form onSubmit={addRecord} className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-3"><label className="text-sm font-semibold">Lote<select required value={record.batchId} onChange={(e) => setRecord({ ...record, batchId: e.target.value })} className="mt-2 w-full rounded-xl border p-3"><option value="">Selecciona</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>Lote #{batch.id}</option>)}</select></label><label className="text-sm font-semibold">Etapa<input required value={record.stage} onChange={(e) => setRecord({ ...record, stage: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label><label className="text-sm font-semibold">Observación<input required value={record.note} onChange={(e) => setRecord({ ...record, note: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label><button className="rounded-xl border px-4 py-3 text-sm font-bold md:col-span-3">Agregar evidencia manual</button></form>}{message && <p role="status" className="text-sm text-emerald-800">{message}</p>}{batches.length === 0 ? <Empty>No hay lotes visibles.</Empty> : <div className="grid gap-3 md:grid-cols-2">{batches.map((batch) => <article key={batch.id} className="rounded-2xl border bg-white p-5"><h3 className="font-black">Lote #{batch.id}</h3><p className="mt-1 text-sm text-stone-500">Estado: {batch.status} · Productor #{batch.producer_id}</p></article>)}</div>}</section>;
}

export function IoTPanel({ token, onError }: CommonProps) {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [form, setForm] = useState({ deviceId: "", batchId: "", token: "" });
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { setDevices(await getIoTDevices(token)); } catch (error) { onError(errorMessage(error)); } }, [onError, token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await registerIoTDevice(token, { device_id: form.deviceId, batch_id: form.batchId ? Number(form.batchId) : undefined, token: form.token }); setForm({ deviceId: "", batchId: "", token: "" }); setMessage("Dispositivo registrado. Guarda el token fuera del sistema."); await load(); } catch (error) { onError(errorMessage(error)); }
  }
  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Telemetría autenticada</p><h2 className="mt-1 text-3xl font-black">Dispositivos IoT</h2></div><form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-3"><label className="text-sm font-semibold">Identificador<input required value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label><label className="text-sm font-semibold">Lote<input type="number" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label><label className="text-sm font-semibold">Token del dispositivo<input required minLength={24} type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label><button className="rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white md:col-span-3">Registrar dispositivo</button></form>{message && <p role="status" className="text-sm text-emerald-800">{message}</p>}{devices.length === 0 ? <Empty>No hay dispositivos registrados.</Empty> : <div className="grid gap-3">{devices.map((device) => <article key={device.device_id} className="rounded-2xl border bg-white p-5"><h3 className="font-black">{device.device_id}</h3><p className="text-sm text-stone-500">Lote {device.batch_id ?? "sin asignar"} · {device.is_active ? "Activo" : "Revocado"}</p></article>)}</div>}</section>;
}
