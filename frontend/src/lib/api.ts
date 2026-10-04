const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export interface Product {
  id: number; batch_id: number; name: string; description: string | null;
  price: number; stock: number; attributes: Record<string, any> | null;
  image_url: string | null; created_at: string; updated_at: string | null;
}
export interface OrderCreatePayload {
  customer_name: string; customer_email: string; customer_phone: string;
  shipping_address: string; city: string; department?: string;
  payment_method?: string; notes?: string;
  items: Array<{ product_id: number; quantity: number }>;
}
export interface OrderResponse { id: number; customer_name: string; customer_email: string; customer_phone: string; shipping_address: string; city: string; department: string; total_amount: number; status: string; payment_method: string; created_at: string; items: Array<Record<string, any>>; }
export interface AdminSummary { users: number; batches: number; products: number; orders: number; iot_devices: number; notarized_batches: number; audit_events: number; }
export type UserRole = "admin" | "accountant" | "seller" | "producer" | "marketing" | "buyer" | "customer" | "auditor";
export interface CurrentUser { id: number; email: string; full_name: string | null; role: UserRole; is_active: boolean; created_at: string; }
export interface AccessProfile { user_id: number; role: UserRole; modules: string[]; }
export interface AccountingSummary { gross_sales: number; direct_cost: number; producer_payout: number; seller_commission: number; platform_margin: number; settlements: number; review_required: number; }
export interface WeatherPoint { timestamp: string; temperature_c: number | null; relative_humidity_pct: number | null; precipitation_probability_pct: number | null; precipitation_mm: number | null; wind_speed_kmh: number | null; }
export interface WeatherForecast { source: string; location: string; latitude: number; longitude: number; timezone: string; generated_at: string; forecast_days: number; data_type: "weather_forecast"; hourly: WeatherPoint[]; }
export interface BatchTimelineResponse { batch_id: number; batch_status: string; product: { id: number | null; name: string; category: string; price: number; image_url: string | null }; details: Record<string, any>; stages: Array<Record<string, any>>; notarization: Record<string, any>; }
export interface BackendHealth { status: string; message: string; version: string; }

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, cache: "no-store" });
  if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.detail || `Error ${response.status}`); }
  return response.json();
}
async function authenticatedGet<T>(path: string, token: string): Promise<T> {
  return jsonRequest<T>(path, { headers: { Authorization: `Bearer ${token}` } });
}

export async function login(email: string, password: string): Promise<string> {
  const data = await jsonRequest<{ access_token: string }>("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  return data.access_token;
}
export function getCurrentUser(token: string) { return authenticatedGet<CurrentUser>("/users/me", token); }
export function getMyAccess(token: string) { return authenticatedGet<AccessProfile>("/users/me/access", token); }
export function getAdminSummary(token: string) { return authenticatedGet<AdminSummary>("/admin/summary", token); }
export function getAuditEvents(token: string) { return authenticatedGet<Array<Record<string, any>>>("/admin/audit-events", token); }
export function getAccountingSummary(token: string) { return authenticatedGet<AccountingSummary>("/accounting/summary", token); }
export async function checkBackendHealth(): Promise<BackendHealth> {
  const response = await fetch(`${BACKEND_BASE_URL}/health`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Error ${response.status}`);
  return response.json();
}
export async function getProducts(skip = 0, limit = 100): Promise<Product[]> {
  try { return await jsonRequest<Product[]>(`/products?skip=${skip}&limit=${limit}`); } catch (error) { console.error("Error al obtener productos:", error); return []; }
}
export async function createOrder(payload: OrderCreatePayload): Promise<OrderResponse> {
  return jsonRequest<OrderResponse>("/orders/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
export async function getBatchTimeline(batchId: number): Promise<BatchTimelineResponse | null> {
  try { return await jsonRequest<BatchTimelineResponse>(`/batches/${batchId}/timeline`); } catch (error) { console.error(`Error al consultar timeline del lote ${batchId}:`, error); return null; }
}
export async function getWeatherForecast(days = 3): Promise<WeatherForecast | null> {
  try { return await jsonRequest<WeatherForecast>(`/weather/forecast?days=${days}`); } catch (error) { console.error("Error al consultar pronóstico de Icononzo:", error); return null; }
}
