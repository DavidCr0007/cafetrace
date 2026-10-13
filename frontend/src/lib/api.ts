const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type UserRole = "admin" | "accountant" | "seller" | "producer" | "marketing" | "buyer" | "auditor";

export interface ProductAttributes {
  category?: "coffee" | "cured_meats" | string;
  sca_score?: number;
  altitude?: number;
  variety?: string;
  process_method?: string;
  cup_profile?: string[];
  temperature_control?: string;
  sanitary_registry?: string;
  expiration_date?: string;
  blockchain_verified?: boolean;
  [key: string]: JsonValue | undefined;
}

export interface Product {
  id: number;
  batch_id: number;
  seller_id: number | null;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  attributes: ProductAttributes | null;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface OrderCreatePayload {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  department?: string;
  payment_method?: string;
  notes?: string;
  items: Array<{ product_id: number; quantity: number }>;
}

export interface OrderResponse {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  department: string;
  total_amount: number;
  status: string;
  payment_method: string;
  customer_user_id: number | null;
  seller_id: number | null;
  created_at: string;
  items: Array<Record<string, JsonValue>>;
}

export interface AdminSummary { users: number; batches: number; products: number; orders: number; iot_devices: number; notarized_batches: number; audit_events: number; }
export interface CurrentUser { id: number; email: string; full_name: string | null; role: UserRole; is_active: boolean; created_at: string; }
export interface AccessProfile { user_id: number; role: UserRole; modules: string[]; }
export interface AccountingSummary { gross_sales: number; direct_cost: number; producer_payout: number; seller_commission: number; platform_margin: number; settlements: number; review_required: number; }
export interface WeatherPoint { timestamp: string; temperature_c: number | null; relative_humidity_pct: number | null; precipitation_probability_pct: number | null; precipitation_mm: number | null; wind_speed_kmh: number | null; }
export interface WeatherForecast { source: string; location: string; latitude: number; longitude: number; timezone: string; generated_at: string; forecast_days: number; data_type: "weather_forecast"; hourly: WeatherPoint[]; }
// La línea de tiempo es un esquema polimórfico según el tipo de lote. Se mantiene
// abierta hasta que el backend exponga una unión discriminada por etapa.
export interface BatchTimelineResponse { batch_id: number; batch_status: string; product: { id: number | null; name: string; category: string; price: number; image_url: string | null }; details: Record<string, any>; stages: Array<Record<string, any>>; notarization: Record<string, any>; }
export interface BackendHealth { status: string; message: string; version: string; }
export interface BackendReadiness { status: "ready"; database: "ok"; }
export interface BackendDiagnostics {
  api: boolean;
  database: boolean;
  checkedAt: string;
  health: BackendHealth | null;
  message: string;
}
export interface AuditEvent { id: number; action: string; resource_type: string; resource_id: string | null; metadata: Record<string, JsonValue> | null; actor_user_id: number | null; timestamp: string; }
export interface PasswordResetRequest { id: number; user_id: number; email: string; status: string; expires_at: string; requested_at: string; }
export interface UserUpdatePayload { email?: string; full_name?: string; password?: string; }
export interface AdminUserUpdatePayload { email?: string; full_name?: string; role?: UserRole; is_active?: boolean; }
export interface AdminUserCreatePayload { email: string; full_name?: string; role: UserRole; password: string; is_active: boolean; }
export type AccessMatrix = Record<UserRole, string[]>;
export interface Batch { id: number; producer_id: number; seller_id: number | null; status: string; details: Record<string, JsonValue> | null; created_at: string; updated_at: string | null; }
export interface IoTDevice { device_id: string; batch_id: number | null; is_active: boolean; last_seen_at: string | null; }
export interface ShipmentPayload { carrier?: string; tracking_number?: string; status: string; cold_chain_required?: boolean; last_temperature_c?: number; }

interface ValidationIssue { msg?: string; }

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function apiErrorMessage(payload: { detail?: string | ValidationIssue[] } | null, status: number): string {
  if (typeof payload?.detail === "string") return payload.detail;
  if (Array.isArray(payload?.detail)) {
    const messages = payload.detail.map((issue) => issue.msg).filter(Boolean);
    if (messages.length) return messages.join(" · ");
  }
  return `La solicitud falló con estado ${status}`;
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, cache: "no-store", credentials: "include" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string | ValidationIssue[] } | null;
    throw new ApiError(apiErrorMessage(payload, response.status), response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function refreshAccessToken(): Promise<string> {
  const data = await jsonRequest<{ access_token: string }>("/auth/refresh", { method: "POST" });
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("cafetrace_access_token", data.access_token);
    window.dispatchEvent(new CustomEvent("cafetrace-token-refreshed", { detail: data.access_token }));
  }
  return data.access_token;
}

async function authenticatedRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  try {
    return await jsonRequest<T>(path, { ...init, headers });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshedToken = await refreshAccessToken();
    headers.set("Authorization", `Bearer ${refreshedToken}`);
    return jsonRequest<T>(path, { ...init, headers });
  }
}

export async function login(email: string, password: string): Promise<string> {
  const data = await jsonRequest<{ access_token: string }>("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  return data.access_token;
}
export function logoutSession() { return jsonRequest<void>("/auth/logout", { method: "POST" }); }

export function getCurrentUser(token: string) { return authenticatedRequest<CurrentUser>("/users/me", token); }
export function getMyAccess(token: string) { return authenticatedRequest<AccessProfile>("/users/me/access", token); }
export function updateCurrentUser(token: string, payload: UserUpdatePayload) { return authenticatedRequest<CurrentUser>("/users/me", token, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function getUsers(token: string) { return authenticatedRequest<CurrentUser[]>("/users/", token); }
export function getAccessMatrix(token: string) { return authenticatedRequest<AccessMatrix>("/admin/access-matrix", token); }
export function createManagedUser(token: string, payload: AdminUserCreatePayload) { return authenticatedRequest<CurrentUser>("/admin/users", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function updateManagedUser(token: string, userId: number, payload: AdminUserUpdatePayload) { return authenticatedRequest<CurrentUser>(`/admin/users/${userId}`, token, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function rotateUserAccessCode(token: string, userId: number) { return authenticatedRequest<{ user_id: number; access_code: string }>(`/admin/users/${userId}/access-code`, token, { method: "POST" }); }
export function getAdminSummary(token: string) { return authenticatedRequest<AdminSummary>("/admin/summary", token); }
export function getAuditEvents(token: string) { return authenticatedRequest<AuditEvent[]>("/admin/audit-events", token); }
export function getPasswordResetRequests(token: string) { return authenticatedRequest<PasswordResetRequest[]>("/admin/password-reset-requests", token); }
export function getAccountingSummary(token: string) { return authenticatedRequest<AccountingSummary>("/accounting/summary", token); }
export function getAccessibleProducts(token: string) { return authenticatedRequest<Product[]>("/products/management/accessible", token); }
export function getCatalogBatches(token: string) { return authenticatedRequest<Batch[]>("/products/management/batches", token); }
export function createProduct(token: string, payload: { batch_id: number; seller_id?: number; name: string; description?: string; price: number; stock: number; attributes?: Record<string, JsonValue> }) { return authenticatedRequest<Product>("/products/", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function updateProduct(token: string, productId: number, payload: Partial<Pick<Product, "name" | "description" | "price" | "stock" | "seller_id">>) { return authenticatedRequest<Product>(`/products/${productId}`, token, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function getOrders(token: string) { return authenticatedRequest<OrderResponse[]>("/orders/", token); }
export function updateOrderStatus(token: string, orderId: number, status: string) { return authenticatedRequest<OrderResponse>(`/orders/${orderId}/status`, token, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); }
export function updateShipment(token: string, orderId: number, payload: ShipmentPayload) { return authenticatedRequest<Record<string, JsonValue>>(`/operations/orders/${orderId}/shipment`, token, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function getBatches(token: string) { return authenticatedRequest<Batch[]>("/batches/", token); }
export function createBatch(token: string, payload: { producer_id: number; seller_id?: number; status: string; details?: Record<string, JsonValue> }) { return authenticatedRequest<Batch>("/batches/", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function updateBatch(token: string, batchId: number, payload: { seller_id?: number; status?: string; details?: Record<string, JsonValue> }) { return authenticatedRequest<Batch>(`/batches/${batchId}`, token, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function createTraceabilityRecord(token: string, batchId: number, payload: { record_type: "manual"; data: Record<string, JsonValue> }) { return authenticatedRequest<Record<string, JsonValue>>(`/batches/${batchId}/records`, token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batch_id: batchId, ...payload }) }); }
export function getIoTDevices(token: string) { return authenticatedRequest<IoTDevice[]>("/iot/devices", token); }
export function registerIoTDevice(token: string, payload: { device_id: string; batch_id?: number; token: string }) { return authenticatedRequest<{ device_id: string; batch_id: number | null; status: string }>("/iot/devices", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }

export async function diagnoseBackend(): Promise<BackendDiagnostics> {
  const checkedAt = new Date().toISOString();
  let health: BackendHealth;
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/health`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    health = await response.json() as BackendHealth;
  } catch {
    return { api: false, database: false, checkedAt, health: null, message: "FastAPI no responde en el origen configurado" };
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/health/ready`, { cache: "no-store" });
    if (!response.ok) {
      return { api: true, database: false, checkedAt, health, message: `FastAPI responde, pero PostgreSQL no está disponible (${response.status})` };
    }
    const payload = await response.json() as BackendReadiness;
    const database = payload.status === "ready" && payload.database === "ok";
    return { api: true, database, checkedAt, health, message: database ? "Frontend, API y PostgreSQL están comunicados" : "PostgreSQL no confirmó disponibilidad" };
  } catch {
    return { api: true, database: false, checkedAt, health, message: "FastAPI responde, pero falló la comprobación de PostgreSQL" };
  }
}

export async function checkBackendHealth(): Promise<BackendHealth> {
  const diagnostics = await diagnoseBackend();
  if (!diagnostics.api || !diagnostics.database || !diagnostics.health) {
    throw new Error(diagnostics.message);
  }
  return diagnostics.health;
}

export async function getProducts(skip = 0, limit = 100): Promise<Product[]> {
  try { return await jsonRequest<Product[]>(`/products?skip=${skip}&limit=${limit}`); }
  catch (error) { console.error("Error al obtener productos:", error); return []; }
}

export function createOrder(payload: OrderCreatePayload): Promise<OrderResponse> {
  const token = typeof window !== "undefined" ? window.sessionStorage.getItem("cafetrace_access_token") : null;
  const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) };
  return token ? authenticatedRequest<OrderResponse>("/orders/", token, init) : jsonRequest<OrderResponse>("/orders/", init);
}

export async function getBatchTimeline(batchId: number): Promise<BatchTimelineResponse | null> {
  try { return await jsonRequest<BatchTimelineResponse>(`/batches/${batchId}/timeline`); }
  catch (error) { console.error(`Error al consultar timeline del lote ${batchId}:`, error); return null; }
}

export async function getWeatherForecast(days = 3): Promise<WeatherForecast | null> {
  try { return await jsonRequest<WeatherForecast>(`/weather/forecast?days=${days}`); }
  catch (error) { console.error("Error al consultar pronóstico de Icononzo:", error); return null; }
}
