import type { CoffeeAttributes, MeatAttributes, Product, ProductType } from "@/lib/api";

// Etiquetas en español para los valores enumerados que define el backend
// (app/modules/traceability/attributes.py). Mantener ambos lados sincronizados.
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = { coffee: "Café", meat: "Cárnico" };

export const COFFEE_PROCESS_LABELS: Record<CoffeeAttributes["process"], string> = {
  washed: "Lavado", natural: "Natural", honey: "Honey", anaerobic: "Anaeróbico",
};
export const DRYING_METHOD_LABELS: Record<CoffeeAttributes["drying_method"], string> = {
  sun_patio: "Patio al sol", raised_beds: "Camas elevadas", parabolic_dryer: "Marquesina / secador parabólico", mechanical: "Secado mecánico",
};
export const ROAST_LEVEL_LABELS: Record<CoffeeAttributes["roast_level"], string> = {
  green: "Café verde (sin tostar)", light: "Tueste claro", medium: "Tueste medio", medium_dark: "Tueste medio-oscuro", dark: "Tueste oscuro",
};
export const SPECIES_LABELS: Record<MeatAttributes["species"], string> = { bovine: "Bovino", porcine: "Porcino", poultry: "Avícola" };
export const FEEDING_TYPE_LABELS: Record<MeatAttributes["feeding_type"], string> = {
  grass_fed: "Pastoreo", grain_fed: "Concentrado / grano", mixed: "Mixta", free_range: "Libre pastoreo (campero)",
};
export const REFRIGERATION_LABELS: Record<MeatAttributes["refrigeration_type"], string> = {
  chilled: "Refrigerado", vacuum_chilled: "Refrigerado al vacío", frozen: "Congelado",
};

export const CHILLED_RANGE = { min: -2, max: 4 } as const;
export const FROZEN_MAX = -18;

export type FieldErrors = Record<string, string>;

const today = () => new Date().toISOString().slice(0, 10);

function inRange(errors: FieldErrors, field: string, value: number | undefined, min: number, max: number, label: string) {
  if (value === undefined || Number.isNaN(value)) errors[field] = `${label} es obligatorio`;
  else if (value < min || value > max) errors[field] = `${label} debe estar entre ${min} y ${max}`;
}

function requiredText(errors: FieldErrors, field: string, value: string | undefined, label: string) {
  if (!value || value.trim().length < 2) errors[field] = `${label} es obligatorio`;
}

/** Validación de cliente equivalente a CoffeeAttributes; la API vuelve a validar siempre. */
export function validateCoffee(details: Partial<CoffeeAttributes>): FieldErrors {
  const errors: FieldErrors = {};
  requiredText(errors, "farm", details.farm, "La finca");
  requiredText(errors, "variety", details.variety, "La variedad");
  inRange(errors, "altitude_masl", details.altitude_masl, 500, 3000, "La altitud");
  inRange(errors, "drying_days", details.drying_days, 1, 60, "Los días de secado");
  if (!details.harvest_started_on) errors.harvest_started_on = "Indica el inicio de la cosecha";
  if (!details.harvest_ended_on) errors.harvest_ended_on = "Indica el fin de la cosecha";
  else if (details.harvest_ended_on > today()) errors.harvest_ended_on = "La cosecha no puede terminar en el futuro";
  if (details.harvest_started_on && details.harvest_ended_on && details.harvest_ended_on < details.harvest_started_on) {
    errors.harvest_ended_on = "El fin de la cosecha no puede ser anterior al inicio";
  }
  if (details.fermentation_hours !== undefined) inRange(errors, "fermentation_hours", details.fermentation_hours, 0, 240, "La fermentación");
  if (details.moisture_pct !== undefined) inRange(errors, "moisture_pct", details.moisture_pct, 8, 14, "La humedad del grano");
  if (details.sca_score !== undefined) {
    inRange(errors, "sca_score", details.sca_score, 0, 100, "El puntaje SCA");
    if (!errors.sca_score && Math.abs(Math.round(details.sca_score * 10) - details.sca_score * 10) > 1e-9) errors.sca_score = "El puntaje SCA admite un decimal";
  }
  if (details.roast_date) {
    if (details.roast_level === "green") errors.roast_date = "Un café verde no tiene fecha de tostión";
    else if (details.roast_date > today()) errors.roast_date = "La tostión no puede estar en el futuro";
    else if (details.harvest_ended_on && details.roast_date < details.harvest_ended_on) errors.roast_date = "La tostión no puede ser anterior al fin de la cosecha";
  }
  return errors;
}

/** Validación de cliente equivalente a MeatAttributes, incluida la coherencia de cadena de frío. */
export function validateMeat(details: Partial<MeatAttributes>): FieldErrors {
  const errors: FieldErrors = {};
  requiredText(errors, "farm", details.farm, "La finca");
  if (details.animal_age_months === undefined || Number.isNaN(details.animal_age_months) || details.animal_age_months <= 0 || details.animal_age_months > 240) {
    errors.animal_age_months = "La edad debe estar entre 1 y 240 meses";
  }
  inRange(errors, "storage_temp_min_c", details.storage_temp_min_c, -40, 10, "La temperatura mínima");
  inRange(errors, "storage_temp_max_c", details.storage_temp_max_c, -40, 10, "La temperatura máxima");
  if (!details.slaughter_date) errors.slaughter_date = "Indica la fecha de sacrificio";
  else if (details.slaughter_date > today()) errors.slaughter_date = "La fecha de sacrificio no puede estar en el futuro";
  const { storage_temp_min_c: min, storage_temp_max_c: max } = details;
  if (min !== undefined && max !== undefined && !errors.storage_temp_min_c && !errors.storage_temp_max_c) {
    if (min > max) errors.storage_temp_min_c = "La mínima no puede superar la máxima";
    else if (details.refrigeration_type === "frozen" && max > FROZEN_MAX) errors.storage_temp_max_c = `La congelación exige una máxima ≤ ${FROZEN_MAX} °C`;
    else if (details.refrigeration_type !== "frozen" && (min < CHILLED_RANGE.min || max > CHILLED_RANGE.max)) {
      errors.storage_temp_max_c = `La refrigeración exige un rango entre ${CHILLED_RANGE.min} y ${CHILLED_RANGE.max} °C`;
    }
  }
  if (details.live_weight_kg !== undefined && details.carcass_weight_kg !== undefined && details.carcass_weight_kg > details.live_weight_kg) {
    errors.carcass_weight_kg = "El peso en canal no puede superar el peso vivo";
  }
  return errors;
}

/** Categoría comercial del producto; acepta la etiqueta legada `cured_meats`. */
export function productCategory(product: Product): ProductType | null {
  const category = product.attributes?.category;
  if (category === "coffee" || product.attributes?.sca_score !== undefined) return "coffee";
  if (category === "meat" || category === "cured_meats" || product.attributes?.temperature_control !== undefined) return "meat";
  return null;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // Fechas ISO sin hora se interpretan como locales para no desplazar el día.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}
