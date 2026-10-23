import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  MapPin,
  Thermometer,
  Droplets,
  Calendar,
  Award,
  ArrowLeft,
  Cpu,
  ExternalLink,
  Snowflake,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { getBatchTimeline, getWeatherForecast, BatchTimelineResponse, WeatherForecast } from "@/lib/api";
import {
  COFFEE_PROCESS_LABELS,
  DRYING_METHOD_LABELS,
  FEEDING_TYPE_LABELS,
  formatDate,
  PRODUCT_TYPE_LABELS,
  REFRIGERATION_LABELS,
  ROAST_LEVEL_LABELS,
  SPECIES_LABELS,
} from "@/lib/traceability";

interface TracePageProps {
  params: Promise<{
    batchId: string;
  }>;
}

export const dynamic = "force-dynamic";

const POLYGON_EXPLORERS: Record<number, string> = {
  80002: "https://amoy.polygonscan.com/tx",
  137: "https://polygonscan.com/tx",
};

type Fact = { label: string; value: React.ReactNode };

function FactGrid({ facts }: { facts: Fact[] }) {
  const visible = facts.filter((fact) => fact.value !== undefined && fact.value !== null && fact.value !== "");
  if (visible.length === 0) return <p className="text-xs text-stone-500">Sin datos declarados para esta etapa.</p>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
      {visible.map((fact) => (
        <div key={fact.label} className="bg-stone-900/60 p-3 rounded-xl border border-stone-800">
          <dt className="text-stone-400 mb-1">{fact.label}</dt>
          <dd className="font-bold text-white text-sm">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Stage({ icon, tone, eyebrow, title, aside, children }: { icon: React.ReactNode; tone: string; eyebrow: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className={`absolute -left-[30px] md:-left-[38px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-md ${tone}`}>
        {icon}
      </div>
      <div className="bg-stone-800/70 border border-stone-700 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-700/60 pb-3 mb-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-stone-400">{eyebrow}</span>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          {aside}
        </div>
        {children}
      </div>
    </div>
  );
}

function originLabel(timeline: BatchTimelineResponse): string {
  const { vereda, municipality, department } = timeline.origin;
  return [vereda, municipality, department].filter(Boolean).join(", ");
}

export default async function TracePage({ params }: TracePageProps) {
  const { batchId: rawBatchId } = await params;
  const batchId = Number.parseInt(rawBatchId, 10);
  const [timeline, weatherForecast]: [BatchTimelineResponse | null, WeatherForecast | null] = Number.isFinite(batchId)
    ? await Promise.all([getBatchTimeline(batchId), getWeatherForecast(3)])
    : [null, null];

  // Sin datos reales no se muestra ningún pasaporte: un ejemplo simulado aparentaría una verificación inexistente.
  if (!timeline) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Trazabilidad no disponible</h1>
          <p className="text-stone-400 mt-2">No fue posible consultar el lote #{rawBatchId}. Intenta nuevamente más tarde.</p>
          <Link href="/" className="inline-block mt-6 px-4 py-2 rounded-xl bg-emerald-700">Volver a la tienda</Link>
        </div>
      </main>
    );
  }

  const isCoffee = timeline.product_type === "coffee";
  const attrs = timeline.attributes;
  const notarization = timeline.notarization;
  const notarized = notarization.is_immutable && Boolean(notarization.transaction_hash);
  const explorerBase = notarization.chain_id ? POLYGON_EXPLORERS[notarization.chain_id] : undefined;
  const explorerUrl = notarized && explorerBase ? `${explorerBase}/${notarization.transaction_hash}` : null;
  const coordinates = timeline.origin.coordinates;
  const lastReading = timeline.iot_records.at(-1);
  const coldRange = attrs.storage_temp_min_c !== undefined && attrs.storage_temp_max_c !== undefined
    ? `${attrs.storage_temp_min_c} °C a ${attrs.storage_temp_max_c} °C`
    : undefined;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 pb-28">
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-stone-300 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </Link>
          <span className="text-xs font-semibold text-stone-300 bg-stone-800 border border-stone-700 px-3 py-1 rounded-full">
            {PRODUCT_TYPE_LABELS[timeline.product_type]} · Lote #{timeline.batch_id}
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden pt-12 pb-16 px-6 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-900 border-b border-stone-800">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Pasaporte digital de trazabilidad
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">{timeline.product.name}</h1>
          <p className="text-sm md:text-base text-stone-400 mt-3 max-w-xl mx-auto">
            Lote #{timeline.batch_id} • {timeline.origin.farm ? `${timeline.origin.farm}, ` : ""}{originLabel(timeline)}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-10">
            <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Origen</span>
              <span className="text-base font-bold text-white mt-1 block truncate">{timeline.origin.farm ?? "Finca no declarada"}</span>
              <span className="text-xs text-stone-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-emerald-400" /> {timeline.origin.municipality}</span>
            </div>
            <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">{isCoffee ? "Altitud y variedad" : "Especie y edad"}</span>
              <span className="text-base font-bold text-white mt-1 block truncate">
                {isCoffee
                  ? (attrs.altitude_masl ? `${attrs.altitude_masl} msnm` : "—")
                  : (attrs.species ? SPECIES_LABELS[attrs.species] : "—")}
              </span>
              <span className="text-xs text-stone-400 mt-0.5 block truncate">
                {isCoffee ? attrs.variety : attrs.animal_age_months ? `${attrs.animal_age_months} meses` : ""}
              </span>
            </div>
            <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">{isCoffee ? "Puntaje SCA" : "Cadena de frío"}</span>
              {isCoffee ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="text-xl font-black text-amber-300">{attrs.sca_score ?? "Sin cata"}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  <Snowflake className="w-5 h-5 text-sky-400" />
                  <span className="text-sm font-bold text-sky-300">{coldRange ?? "—"}</span>
                </div>
              )}
              <span className="text-[11px] text-stone-400 mt-0.5 block">
                {isCoffee ? (attrs.roast_level ? ROAST_LEVEL_LABELS[attrs.roast_level] : "") : (attrs.refrigeration_type ? REFRIGERATION_LABELS[attrs.refrigeration_type] : "")}
              </span>
            </div>
            <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Blockchain</span>
              {notarized ? (
                <span className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Notarizado</span>
              ) : (
                <span className="text-base font-bold text-stone-300 mt-1 flex items-center gap-1"><Clock className="w-4 h-4" /> Pendiente</span>
              )}
              <span className="text-[11px] text-stone-400 font-mono mt-0.5 block truncate">
                {notarized && notarization.block_number ? `Bloque #${notarization.block_number}` : "Sin registro on-chain"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pt-14">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black text-white">La historia del lote #{timeline.batch_id}</h2>
          <p className="text-xs md:text-sm text-stone-400 mt-1">Solo se muestran datos declarados o medidos; las etapas sin evidencia se indican como tales.</p>
        </div>

        <div className="relative pl-6 md:pl-10 space-y-12 before:content-[''] before:absolute before:left-3 md:before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-amber-500 before:to-emerald-500">
          <Stage
            icon={<MapPin className="w-4 h-4" />}
            tone="bg-emerald-950 border-emerald-500 text-emerald-400"
            eyebrow="Etapa 1 • Origen"
            title="Finca y productor"
            aside={coordinates && (
              <span className="text-xs font-mono text-stone-400 bg-stone-900 px-2.5 py-1 rounded-lg self-start md:self-auto">
                GPS: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </span>
            )}
          >
            <FactGrid facts={[
              { label: "Municipio y región", value: originLabel(timeline) },
              { label: "Finca", value: timeline.origin.farm },
              { label: "Productor", value: timeline.producer_name },
              { label: "Certificaciones", value: timeline.origin.certifications?.join(", ") },
            ]} />
          </Stage>

          {isCoffee ? (
            <Stage icon={<Calendar className="w-4 h-4" />} tone="bg-amber-950 border-amber-500 text-amber-400" eyebrow="Etapa 2 • Beneficio" title="Cosecha, beneficio y secado">
              <FactGrid facts={[
                { label: "Cosecha", value: attrs.harvest_started_on && `${formatDate(attrs.harvest_started_on)} – ${formatDate(attrs.harvest_ended_on)}` },
                { label: "Proceso", value: attrs.process && COFFEE_PROCESS_LABELS[attrs.process] },
                { label: "Fermentación", value: attrs.fermentation_hours !== undefined ? `${attrs.fermentation_hours} h` : undefined },
                { label: "Método de secado", value: attrs.drying_method && DRYING_METHOD_LABELS[attrs.drying_method] },
                { label: "Tiempo de secado", value: attrs.drying_days !== undefined ? `${attrs.drying_days} días` : undefined },
                { label: "Humedad del grano", value: attrs.moisture_pct !== undefined ? `${attrs.moisture_pct} %` : undefined },
                { label: "Tipo de tostado", value: attrs.roast_level && ROAST_LEVEL_LABELS[attrs.roast_level] },
                { label: "Fecha de tostión", value: attrs.roast_date && formatDate(attrs.roast_date) },
              ]} />
            </Stage>
          ) : (
            <Stage icon={<Calendar className="w-4 h-4" />} tone="bg-amber-950 border-amber-500 text-amber-400" eyebrow="Etapa 2 • Crianza y beneficio" title="Animal, alimentación y sacrificio">
              <FactGrid facts={[
                { label: "Especie", value: attrs.species && SPECIES_LABELS[attrs.species] },
                { label: "Raza", value: attrs.breed },
                { label: "Edad del animal", value: attrs.animal_age_months !== undefined ? `${attrs.animal_age_months} meses` : undefined },
                { label: "Alimentación", value: attrs.feeding_type && FEEDING_TYPE_LABELS[attrs.feeding_type] },
                { label: "Fecha de sacrificio", value: attrs.slaughter_date && formatDate(attrs.slaughter_date) },
                { label: "Planta de beneficio", value: attrs.slaughterhouse },
                { label: "Periodo de retiro", value: attrs.withdrawal_period_respected === undefined ? undefined : attrs.withdrawal_period_respected ? "Respetado" : "No respetado" },
                { label: "Corte", value: attrs.cut },
              ]} />
            </Stage>
          )}

          <Stage
            icon={<Cpu className="w-4 h-4" />}
            tone="bg-sky-950 border-sky-500 text-sky-400"
            eyebrow="Etapa 3 • Telemetría"
            title="Lecturas de sensores del lote"
            aside={<span className="text-xs text-stone-400">{timeline.iot_records.length} lecturas</span>}
          >
            {lastReading ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-stone-900/80 rounded-2xl border border-stone-800 flex items-center gap-3">
                    <Thermometer className="w-5 h-5 text-sky-400" />
                    <div>
                      <span className="text-xs text-stone-400">Última temperatura</span>
                      <span className="text-lg font-extrabold text-white block">{lastReading.temperature ?? "—"} °C</span>
                    </div>
                  </div>
                  <div className="p-4 bg-stone-900/80 rounded-2xl border border-stone-800 flex items-center gap-3">
                    <Droplets className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="text-xs text-stone-400">Última humedad relativa</span>
                      <span className="text-lg font-extrabold text-white block">{lastReading.humidity ?? "—"} %</span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-1 text-xs text-stone-400">
                  {timeline.iot_records.slice(-6).reverse().map((reading) => (
                    <li key={reading.id} className="flex justify-between gap-3 border-b border-stone-800 py-1.5">
                      <span className="font-mono">{reading.sensor_id ?? "sensor"}</span>
                      <span>{reading.temperature ?? "—"} °C · {reading.humidity ?? "—"} %</span>
                      <span>{reading.timestamp ? new Date(reading.timestamp).toLocaleString("es-CO") : "—"}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-stone-500">Este lote aún no tiene lecturas de sensores registradas.</p>
            )}
          </Stage>

          {weatherForecast && (
            <div className="bg-stone-800/70 border border-emerald-900 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-700/60 pb-3 mb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Contexto • Pronóstico</span>
                  <h3 className="text-lg font-bold text-white">Clima previsto para {weatherForecast.location}</h3>
                </div>
                <span className="text-xs text-stone-400">Fuente: {weatherForecast.source} · {weatherForecast.forecast_days} días</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {weatherForecast.hourly.slice(0, 3).map((point) => (
                  <div key={point.timestamp} className="bg-stone-900/70 rounded-xl p-3 border border-stone-800 text-xs">
                    <span className="text-stone-400 block">{new Date(point.timestamp).toLocaleString("es-CO", { weekday: "short", hour: "2-digit" })}</span>
                    <strong className="text-white text-lg block mt-1">{point.temperature_c ?? "—"} °C</strong>
                    <span className="text-sky-300 block">Humedad: {point.relative_humidity_pct ?? "—"}%</span>
                    <span className="text-amber-300 block">Lluvia: {point.precipitation_probability_pct ?? "—"}%</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-stone-500 mt-3">Pronóstico externo; no reemplaza la telemetría observada de los sensores del lote.</p>
            </div>
          )}

          {isCoffee ? (
            <Stage icon={<Award className="w-4 h-4" />} tone="bg-emerald-950 border-emerald-500 text-emerald-400" eyebrow="Etapa 4 • Calidad" title="Evaluación de taza">
              {attrs.sca_score !== undefined ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl font-black text-amber-300">{attrs.sca_score}</span>
                    <span className="text-xs text-stone-400 leading-tight">Puntaje en escala SCA<br />declarado por el productor</span>
                  </div>
                  {attrs.cup_notes && attrs.cup_notes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {attrs.cup_notes.map((note) => (
                        <span key={note} className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">{note}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-stone-500">Este lote aún no tiene una evaluación de taza registrada.</p>
              )}
            </Stage>
          ) : (
            <Stage icon={<Snowflake className="w-4 h-4" />} tone="bg-emerald-950 border-emerald-500 text-emerald-400" eyebrow="Etapa 4 • Inocuidad" title="Cadena de frío y registro sanitario">
              <FactGrid facts={[
                { label: "Tipo de refrigeración", value: attrs.refrigeration_type && REFRIGERATION_LABELS[attrs.refrigeration_type] },
                { label: "Rango de conservación", value: coldRange },
                { label: "Registro sanitario", value: attrs.sanitary_registry },
              ]} />
            </Stage>
          )}

          <Stage
            icon={<ShieldCheck className="w-4 h-4" />}
            tone="bg-purple-950 border-purple-500 text-purple-400"
            eyebrow="Etapa 5 • Notarización"
            title="Registro en Polygon PoS"
            aside={notarized && notarization.network && (
              <span className="text-xs font-mono bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1 rounded-full self-start md:self-auto">{notarization.network}</span>
            )}
          >
            {notarized ? (
              <>
                <p className="text-xs text-stone-300 mb-4 leading-relaxed">
                  La huella SHA-256 de los atributos de este lote está registrada en un contrato inteligente. Cualquier alteración posterior de los datos produciría una huella distinta.
                </p>
                <div className="space-y-2 text-xs font-mono bg-stone-950 p-4 rounded-2xl border border-stone-800">
                  <div>
                    <span className="text-stone-500 block text-[11px]">Huella de datos (SHA-256)</span>
                    <span className="text-stone-300 break-all select-all font-semibold">{notarization.data_hash}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-800">
                    <span className="text-stone-500 block text-[11px]">Transacción</span>
                    <span className="text-emerald-400 break-all select-all font-semibold">{notarization.transaction_hash}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-800 flex justify-between items-center gap-3 text-[11px] font-sans">
                    <span className="text-stone-400">Contrato</span>
                    <span className="font-mono text-stone-300 break-all">{notarization.contract_address}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-stone-400 leading-relaxed">
                Este lote todavía no ha sido notarizado. Los datos mostrados provienen del registro de la plataforma y aún no cuentan con huella en blockchain.
              </p>
            )}

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              {explorerUrl && (
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 px-4 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/50 text-purple-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                  <span>Auditar en PolygonScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <Link href="/" className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Comprar productos de este lote</span>
              </Link>
            </div>
          </Stage>
        </div>
      </section>
    </div>
  );
}
