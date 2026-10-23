"use client";

import { FormEvent, ReactNode, useState } from "react";
import { BatchCreatePayload, CoffeeAttributes, createBatch, MeatAttributes, ProductType } from "@/lib/api";
import {
  CHILLED_RANGE, COFFEE_PROCESS_LABELS, DRYING_METHOD_LABELS, FEEDING_TYPE_LABELS, FieldErrors, FROZEN_MAX,
  PRODUCT_TYPE_LABELS, REFRIGERATION_LABELS, ROAST_LEVEL_LABELS, SPECIES_LABELS, validateCoffee, validateMeat,
} from "@/lib/traceability";

type Props = { token: string; producerId: string; onCreated: () => Promise<void> | void; onError: (message: string) => void };

const EMPTY_COFFEE = {
  farm: "", vereda: "", altitude_masl: "", variety: "", harvest_started_on: "", harvest_ended_on: "",
  process: "washed", drying_method: "sun_patio", drying_days: "", roast_level: "green",
  fermentation_hours: "", moisture_pct: "", roast_date: "", sca_score: "", cup_notes: "",
};
const EMPTY_MEAT = {
  farm: "", vereda: "", species: "bovine", breed: "", animal_age_months: "", feeding_type: "grass_fed",
  refrigeration_type: "chilled", storage_temp_min_c: "0", storage_temp_max_c: "4", slaughter_date: "",
  slaughterhouse: "", sanitary_registry: "", live_weight_kg: "", carcass_weight_kg: "", cut: "", withdrawal_period_respected: "",
};

// Los campos opcionales vacíos se omiten: el backend rechaza claves con valores inválidos.
const num = (value: string) => (value.trim() === "" ? undefined : Number(value));
const text = (value: string) => value.trim() || undefined;
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

function buildCoffee(form: typeof EMPTY_COFFEE): Partial<CoffeeAttributes> {
  return {
    farm: form.farm.trim(), vereda: text(form.vereda), altitude_masl: num(form.altitude_masl), variety: form.variety.trim(),
    harvest_started_on: form.harvest_started_on, harvest_ended_on: form.harvest_ended_on,
    process: form.process as CoffeeAttributes["process"], drying_method: form.drying_method as CoffeeAttributes["drying_method"],
    drying_days: num(form.drying_days), roast_level: form.roast_level as CoffeeAttributes["roast_level"],
    fermentation_hours: num(form.fermentation_hours), moisture_pct: num(form.moisture_pct), roast_date: text(form.roast_date),
    sca_score: num(form.sca_score), cup_notes: list(form.cup_notes),
  };
}

function buildMeat(form: typeof EMPTY_MEAT): Partial<MeatAttributes> {
  return {
    farm: form.farm.trim(), vereda: text(form.vereda), species: form.species as MeatAttributes["species"], breed: text(form.breed),
    animal_age_months: num(form.animal_age_months), feeding_type: form.feeding_type as MeatAttributes["feeding_type"],
    refrigeration_type: form.refrigeration_type as MeatAttributes["refrigeration_type"],
    storage_temp_min_c: num(form.storage_temp_min_c), storage_temp_max_c: num(form.storage_temp_max_c), slaughter_date: form.slaughter_date,
    slaughterhouse: text(form.slaughterhouse), sanitary_registry: text(form.sanitary_registry),
    live_weight_kg: num(form.live_weight_kg), carcass_weight_kg: num(form.carcass_weight_kg), cut: text(form.cut),
    withdrawal_period_respected: form.withdrawal_period_respected === "" ? undefined : form.withdrawal_period_respected === "yes",
  };
}

const inputClass = "mt-2 w-full rounded-xl border p-3 font-normal aria-[invalid=true]:border-red-500";

function Field({ label, name, errors, hint, children }: { label: string; name: string; errors: FieldErrors; hint?: string; children: ReactNode }) {
  return <label className="text-sm font-semibold">
    {label}
    {children}
    {errors[name] ? <span id={`${name}-error`} className="mt-1 block text-xs font-normal text-red-700">{errors[name]}</span> : hint && <span className="mt-1 block text-xs font-normal text-stone-500">{hint}</span>}
  </label>;
}

function Options<T extends string>({ labels }: { labels: Record<T, string> }) {
  return <>{(Object.entries(labels) as Array<[T, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</>;
}

export function BatchForm({ token, producerId, onCreated, onError }: Props) {
  const [productType, setProductType] = useState<ProductType>("coffee");
  const [coffee, setCoffee] = useState(EMPTY_COFFEE);
  const [meat, setMeat] = useState(EMPTY_MEAT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const coffeeInput = (name: keyof typeof EMPTY_COFFEE, type = "text", extra: Record<string, string | number> = {}) => (
    <input name={name} type={type} value={coffee[name]} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}
      onChange={(event) => setCoffee({ ...coffee, [name]: event.target.value })} className={inputClass} {...extra} />
  );
  const meatInput = (name: keyof typeof EMPTY_MEAT, type = "text", extra: Record<string, string | number> = {}) => (
    <input name={name} type={type} value={meat[name]} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}
      onChange={(event) => setMeat({ ...meat, [name]: event.target.value })} className={inputClass} {...extra} />
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const details = productType === "coffee" ? buildCoffee(coffee) : buildMeat(meat);
    const nextErrors = productType === "coffee" ? validateCoffee(details as Partial<CoffeeAttributes>) : validateMeat(details as Partial<MeatAttributes>);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const base = { producer_id: Number(producerId), status: "harvested" };
    const payload: BatchCreatePayload = productType === "coffee"
      ? { ...base, product_type: "coffee", details: details as CoffeeAttributes }
      : { ...base, product_type: "meat", details: details as MeatAttributes };
    setSaving(true);
    try {
      await createBatch(token, payload);
      setCoffee(EMPTY_COFFEE); setMeat(EMPTY_MEAT);
      await onCreated();
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo crear el lote");
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-lg font-black">Nuevo lote trazable</h3><p className="text-sm text-stone-500">Origen predeterminado: Icononzo, Tolima. Los atributos quedan fijos una vez notarizado el lote.</p></div>
      <div role="radiogroup" aria-label="Tipo de producto" className="flex rounded-xl border p-1">
        {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((type) => (
          <button key={type} type="button" role="radio" aria-checked={productType === type}
            onClick={() => { setProductType(type); setErrors({}); }}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${productType === type ? "bg-stone-950 text-white" : "text-stone-600"}`}>
            {PRODUCT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>

    {productType === "coffee" ? <>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Origen</legend>
        <Field label="Finca *" name="farm" errors={errors}>{coffeeInput("farm")}</Field>
        <Field label="Vereda" name="vereda" errors={errors}>{coffeeInput("vereda")}</Field>
        <Field label="Altitud (msnm) *" name="altitude_masl" errors={errors} hint="Entre 500 y 3000">{coffeeInput("altitude_masl", "number", { min: 500, max: 3000 })}</Field>
        <Field label="Variedad *" name="variety" errors={errors} hint="Ej.: Castillo, Caturra, Colombia">{coffeeInput("variety")}</Field>
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Cosecha y beneficio</legend>
        <Field label="Inicio de cosecha *" name="harvest_started_on" errors={errors}>{coffeeInput("harvest_started_on", "date", { max: today })}</Field>
        <Field label="Fin de cosecha *" name="harvest_ended_on" errors={errors}>{coffeeInput("harvest_ended_on", "date", { max: today })}</Field>
        <Field label="Proceso *" name="process" errors={errors}><select value={coffee.process} onChange={(e) => setCoffee({ ...coffee, process: e.target.value })} className={inputClass}><Options labels={COFFEE_PROCESS_LABELS} /></select></Field>
        <Field label="Fermentación (horas)" name="fermentation_hours" errors={errors}>{coffeeInput("fermentation_hours", "number", { min: 0, max: 240, step: "any" })}</Field>
        <Field label="Método de secado *" name="drying_method" errors={errors}><select value={coffee.drying_method} onChange={(e) => setCoffee({ ...coffee, drying_method: e.target.value })} className={inputClass}><Options labels={DRYING_METHOD_LABELS} /></select></Field>
        <Field label="Días de secado *" name="drying_days" errors={errors}>{coffeeInput("drying_days", "number", { min: 1, max: 60 })}</Field>
        <Field label="Humedad del grano (%)" name="moisture_pct" errors={errors} hint="Entre 8 y 14">{coffeeInput("moisture_pct", "number", { min: 8, max: 14, step: "0.1" })}</Field>
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Tostión y calidad</legend>
        <Field label="Tipo de tostado *" name="roast_level" errors={errors}><select value={coffee.roast_level} onChange={(e) => setCoffee({ ...coffee, roast_level: e.target.value, roast_date: e.target.value === "green" ? "" : coffee.roast_date })} className={inputClass}><Options labels={ROAST_LEVEL_LABELS} /></select></Field>
        <Field label="Fecha de tostión" name="roast_date" errors={errors}>{coffeeInput("roast_date", "date", { max: today, ...(coffee.roast_level === "green" ? { disabled: "disabled" } : {}) })}</Field>
        <Field label="Puntaje SCA" name="sca_score" errors={errors} hint="Un decimal, p. ej. 85.5">{coffeeInput("sca_score", "number", { min: 0, max: 100, step: "0.1" })}</Field>
        <Field label="Notas de taza" name="cup_notes" errors={errors} hint="Separadas por comas">{coffeeInput("cup_notes")}</Field>
      </fieldset>
    </> : <>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Origen y animal</legend>
        <Field label="Finca *" name="farm" errors={errors}>{meatInput("farm")}</Field>
        <Field label="Vereda" name="vereda" errors={errors}>{meatInput("vereda")}</Field>
        <Field label="Especie *" name="species" errors={errors}><select value={meat.species} onChange={(e) => setMeat({ ...meat, species: e.target.value })} className={inputClass}><Options labels={SPECIES_LABELS} /></select></Field>
        <Field label="Raza" name="breed" errors={errors}>{meatInput("breed")}</Field>
        <Field label="Edad del animal (meses) *" name="animal_age_months" errors={errors}>{meatInput("animal_age_months", "number", { min: 1, max: 240, step: "any" })}</Field>
        <Field label="Alimentación *" name="feeding_type" errors={errors}><select value={meat.feeding_type} onChange={(e) => setMeat({ ...meat, feeding_type: e.target.value })} className={inputClass}><Options labels={FEEDING_TYPE_LABELS} /></select></Field>
        <Field label="Peso vivo (kg)" name="live_weight_kg" errors={errors}>{meatInput("live_weight_kg", "number", { min: 0, step: "any" })}</Field>
        <Field label="Peso en canal (kg)" name="carcass_weight_kg" errors={errors}>{meatInput("carcass_weight_kg", "number", { min: 0, step: "any" })}</Field>
        <Field label="Periodo de retiro de medicamentos" name="withdrawal_period_respected" errors={errors}><select value={meat.withdrawal_period_respected} onChange={(e) => setMeat({ ...meat, withdrawal_period_respected: e.target.value })} className={inputClass}><option value="">Sin declarar</option><option value="yes">Respetado</option><option value="no">No respetado</option></select></Field>
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Beneficio y cadena de frío</legend>
        <Field label="Fecha de sacrificio *" name="slaughter_date" errors={errors}>{meatInput("slaughter_date", "date", { max: today })}</Field>
        <Field label="Planta de beneficio" name="slaughterhouse" errors={errors}>{meatInput("slaughterhouse")}</Field>
        <Field label="Registro sanitario (INVIMA)" name="sanitary_registry" errors={errors}>{meatInput("sanitary_registry")}</Field>
        <Field label="Tipo de refrigeración *" name="refrigeration_type" errors={errors}
          hint={meat.refrigeration_type === "frozen" ? `Máxima ≤ ${FROZEN_MAX} °C` : `Rango entre ${CHILLED_RANGE.min} y ${CHILLED_RANGE.max} °C`}>
          <select value={meat.refrigeration_type} onChange={(e) => setMeat({ ...meat, refrigeration_type: e.target.value, ...(e.target.value === "frozen" ? { storage_temp_min_c: "-25", storage_temp_max_c: "-18" } : { storage_temp_min_c: "0", storage_temp_max_c: "4" }) })} className={inputClass}><Options labels={REFRIGERATION_LABELS} /></select>
        </Field>
        <Field label="Temperatura mínima (°C) *" name="storage_temp_min_c" errors={errors}>{meatInput("storage_temp_min_c", "number", { min: -40, max: 10, step: "0.1" })}</Field>
        <Field label="Temperatura máxima (°C) *" name="storage_temp_max_c" errors={errors}>{meatInput("storage_temp_max_c", "number", { min: -40, max: 10, step: "0.1" })}</Field>
        <Field label="Corte" name="cut" errors={errors}>{meatInput("cut")}</Field>
      </fieldset>
    </>}

    {Object.keys(errors).length > 0 && <p role="alert" className="text-sm text-red-700">Revisa los campos marcados antes de crear el lote.</p>}
    <button disabled={saving || !producerId} className="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
      {saving ? "Creando lote…" : `Crear lote de ${PRODUCT_TYPE_LABELS[productType].toLowerCase()}`}
    </button>
  </form>;
}
