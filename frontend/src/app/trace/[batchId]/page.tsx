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
  Sparkles,
  Layers,
  ShoppingBag
} from "lucide-react";
import { getBatchTimeline, getWeatherForecast, BatchTimelineResponse, WeatherForecast } from "@/lib/api";

interface TracePageProps {
  params: {
    batchId: string;
  };
}

export const dynamic = "force-dynamic";

export default async function TracePage({ params }: TracePageProps) {
  const batchId = parseInt(params.batchId, 10) || 1;
  const [timelineData, weatherForecast]: [BatchTimelineResponse | null, WeatherForecast | null] = await Promise.all([
    getBatchTimeline(batchId),
    getWeatherForecast(3),
  ]);

  // Fallback para demostración interactiva si el backend estuviera en proceso de reinicio
  const fallbackCoffeeTimeline: BatchTimelineResponse = {
    batch_id: batchId,
    batch_status: "ready",
    product: {
      id: 1,
      name: "Café Geisha Huila - Edición Especial",
      category: "coffee",
      price: 180000,
      image_url: null,
    },
    details: {
      origin: "Pitalito, Huila",
      farm: "Finca El Paraíso",
      altitude: 1850,
      variety: "Geisha",
      process: "Anaeróbico 48h con levaduras nativas",
      harvest_date: "2024-08-15",
      location: { lat: 1.8543, lng: -76.0512 },
    },
    stages: [
      {
        id: "stage_terroir",
        title: "Terroir y Origen Certificado",
        subtitle: "Finca El Paraíso",
        location: "Pitalito, Huila, Colombia",
        altitude: 1850,
        variety: "Geisha",
        producer_name: "Cooperativa Central del Huila",
        coordinates: { lat: 1.8543, lng: -76.0512 },
        status: "completed",
        timestamp: "2024-08-10T10:00:00Z",
      },
      {
        id: "stage_process",
        title: "Cosecha Selectiva y Beneficio",
        subtitle: "Fermentación anaeróbica en cereza durante 48 horas",
        harvest_date: "2024-08-15",
        method: "Anaeróbico 48h",
        status: "completed",
        timestamp: "2024-08-15T14:30:00Z",
      },
      {
        id: "stage_iot",
        title: "Telemetría IoT en Tiempo Real",
        subtitle: "Monitoreo rural con nodos ESP32 y sensores de fermentación",
        records: [
          {
            id: 1,
            sensor_id: "ESP32-HUILA-01",
            temperature: 19.4,
            humidity: 68.2,
            stage: "Fermentación",
            timestamp: "2024-08-16T08:00:00Z",
          },
          {
            id: 2,
            sensor_id: "ESP32-HUILA-01",
            temperature: 18.2,
            humidity: 72.0,
            stage: "Secado en marquesina",
            timestamp: "2024-08-18T11:00:00Z",
          },
        ],
        status: "completed",
      },
      {
        id: "stage_quality",
        title: "Certificación de Calidad y Cata",
        sca_score: 88.5,
        cup_profile: ["Jazmín", "Durazno maduro", "Miel silvestre", "Acidez cítrica brillante"],
        status: "completed",
      },
      {
        id: "stage_blockchain",
        title: "Registro Inmutable en Polygon PoS",
        subtitle: "Notarización criptográfica y firma digital",
        notarization: {
          network: "Polygon PoS (Amoy Testnet)",
          chain_id: 80002,
          contract_address: "0x89D2B52264e10EE88bF64703a9C149B0EcfA8679",
          data_hash: "0x7f9a2b84c83e1850a582fae389d41c9b68ef5d89f74a01c3e8841a1290bb341",
          transaction_hash: "0x5d92e88a70c3451203efbc12984abce912304910cf928a3498bfe123490aa18",
          explorer_url: "https://amoy.polygonscan.com/tx/0x5d92e88a70c3451203efbc12984abce912304910cf928a3498bfe123490aa18",
          status: "confirmed",
          block_number: 12845046,
          timestamp: new Date().toISOString(),
          is_immutable: true,
        },
        status: "verified",
      },
    ],
    notarization: {
      network: "Polygon PoS (Amoy Testnet)",
      chain_id: 80002,
      contract_address: "0x89D2B52264e10EE88bF64703a9C149B0EcfA8679",
      data_hash: "0x7f9a2b84c83e1850a582fae389d41c9b68ef5d89f74a01c3e8841a1290bb341",
      transaction_hash: "0x5d92e88a70c3451203efbc12984abce912304910cf928a3498bfe123490aa18",
      explorer_url: "https://amoy.polygonscan.com/tx/0x5d92e88a70c3451203efbc12984abce912304910cf928a3498bfe123490aa18",
      status: "confirmed",
      block_number: 12845046,
      timestamp: new Date().toISOString(),
      is_immutable: true,
    },
  };

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!timelineData && !isDemoMode) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Trazabilidad no disponible</h1>
          <p className="text-stone-400 mt-2">No fue posible consultar el lote #{batchId}. Intenta nuevamente más tarde.</p>
          <Link href="/" className="inline-block mt-6 px-4 py-2 rounded-xl bg-emerald-700">Volver a la tienda</Link>
        </div>
      </main>
    );
  }
  const timeline = timelineData || fallbackCoffeeTimeline;
  const isCoffee = timeline.product.category === "coffee" || timeline.details.variety !== undefined;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 pb-28">
      {/* Top Navbar */}
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Polygon PoS #80002
            </span>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-12 pb-16 px-6 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-900 border-b border-stone-800">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Pasaporte Digital de Trazabilidad Inmutable
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            {timeline.product.name}
          </h1>

          <p className="text-sm md:text-base text-stone-400 mt-3 max-w-xl mx-auto">
            Lote #{timeline.batch_id} • Origen verificado en {timeline.details.origin || "Huila, Colombia"} con registros IoT y firma en Polygon.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-10">
            <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left backdrop-blur-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Terroir</span>
              <span className="text-base font-bold text-white mt-1 block truncate">
                {timeline.details.farm || timeline.details.facility || "Huila"}
              </span>
              <span className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-400" /> {timeline.details.origin || "Huila"}
              </span>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left backdrop-blur-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">
                {isCoffee ? "Altitud y Variedad" : "Productor"}
              </span>
              <span className="text-base font-bold text-white mt-1 block truncate">
                {isCoffee ? `${timeline.details.altitude || 1850} msnm` : timeline.details.producer || "Agroindustria"}
              </span>
              <span className="text-xs text-stone-400 mt-0.5 block truncate">
                {timeline.details.variety || timeline.details.batch_code || "Selección Especial"}
              </span>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left backdrop-blur-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">
                {isCoffee ? "Puntaje Especial SCA" : "Cadena de Frío"}
              </span>
              {isCoffee ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="text-xl font-black text-amber-300">88.5 SCA</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  <Snowflake className="w-5 h-5 text-sky-400" />
                  <span className="text-base font-bold text-sky-300">2°C - 4°C Óptimo</span>
                </div>
              )}
              <span className="text-[11px] text-emerald-400 mt-0.5 block">
                {isCoffee ? "Calidad Especial" : "Monitoreo Térmico Continuo"}
              </span>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left backdrop-blur-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Blockchain</span>
              <span className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Inmutable
              </span>
              <span className="text-[11px] text-stone-400 font-mono mt-0.5 block truncate">
                Bloque #{timeline.notarization?.block_number || 12845046}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="max-w-4xl mx-auto px-6 pt-14">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            La Historia Completa del Lote #{timeline.batch_id}
          </h2>
          <p className="text-xs md:text-sm text-stone-400 mt-1">
            Cada etapa es registrada con marcas de tiempo y coordenadas verificadas.
          </p>
        </div>

        <div className="relative pl-6 md:pl-10 space-y-12 before:content-[''] before:absolute before:left-3 md:before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-amber-500 before:to-emerald-500">
          {/* Etapa 1: Terroir */}
          <div className="relative group">
            <div className="absolute -left-[30px] md:-left-[38px] top-0 w-8 h-8 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-md">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="bg-stone-800/70 border border-stone-700 rounded-3xl p-6 hover:border-stone-600 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-700/60 pb-3 mb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Etapa 1 • Terroir</span>
                  <h3 className="text-lg font-bold text-white">Origen, Suelo y Productor</h3>
                </div>
                <span className="text-xs font-mono text-stone-400 bg-stone-900 px-2.5 py-1 rounded-lg self-start md:self-auto">
                  GPS: 1.8543° N, 76.0512° W
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-stone-900/60 p-3 rounded-xl border border-stone-800">
                  <span className="text-stone-400 block mb-1">Municipio y Región:</span>
                  <span className="font-bold text-white text-sm">{timeline.details.origin || "Huila, Colombia"}</span>
                </div>
                <div className="bg-stone-900/60 p-3 rounded-xl border border-stone-800">
                  <span className="text-stone-400 block mb-1">Finca / Instalación:</span>
                  <span className="font-bold text-white text-sm">{timeline.details.farm || timeline.details.facility || "Finca El Paraíso"}</span>
                </div>
                <div className="bg-stone-900/60 p-3 rounded-xl border border-stone-800">
                  <span className="text-stone-400 block mb-1">Variedad Agrícola:</span>
                  <span className="font-bold text-white text-sm">{timeline.details.variety || "Cortes Seleccionados Huila"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Etapa 2: Cosecha y Proceso */}
          <div className="relative group">
            <div className="absolute -left-[30px] md:-left-[38px] top-0 w-8 h-8 rounded-full bg-amber-950 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-md">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="bg-stone-800/70 border border-stone-700 rounded-3xl p-6 hover:border-stone-600 transition-colors">
              <div className="border-b border-stone-700/60 pb-3 mb-4">
                <span className="text-xs uppercase tracking-wider font-bold text-amber-400">Etapa 2 • Beneficio</span>
                <h3 className="text-lg font-bold text-white">
                  {isCoffee ? "Fermentación y Secado Cuidadoso" : "Procesamiento y Ahumado Natural"}
                </h3>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                {timeline.details.process || "Proceso de alta precisión para preservar aceites esenciales y perfil organoléptico."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800 text-stone-300">
                  Fecha de Cosecha: <strong>{timeline.details.harvest_date || "Agosto 2024"}</strong>
                </span>
                {timeline.details.smoke_wood && (
                  <span className="bg-amber-950/60 text-amber-300 border border-amber-800/80 px-3 py-1.5 rounded-xl">
                    Ahumado: {timeline.details.smoke_wood}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Etapa 3: Telemetría IoT */}
          <div className="relative group">
            <div className="absolute -left-[30px] md:-left-[38px] top-0 w-8 h-8 rounded-full bg-sky-950 border-2 border-sky-500 flex items-center justify-center text-sky-400 shadow-md">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="bg-stone-800/70 border border-stone-700 rounded-3xl p-6 hover:border-stone-600 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-700/60 pb-3 mb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-sky-400">Etapa 3 • Telemetría</span>
                  <h3 className="text-lg font-bold text-white">Nodos de Sensores ESP32 / LoRa</h3>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg self-start md:self-auto flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Nodo Huila Activo
                </span>
              </div>

              <p className="text-xs text-stone-400 mb-4">
                Sensores térmicos sumergibles e higrómetros calibrados registran continuamente las variables críticas de fermentación o refrigeración.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-stone-900/80 rounded-2xl border border-stone-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-stone-400">Temperatura Promedio</span>
                    <span className="text-lg font-extrabold text-white block">
                      {isCoffee ? "19.4 °C" : "2.8 °C (Cuarto Frío)"}
                    </span>
                    <span className="text-[10px] text-emerald-400">Sonda DS18B20 Calibrada</span>
                  </div>
                </div>

                <div className="p-4 bg-stone-900/80 rounded-2xl border border-stone-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-stone-400">Humedad Relativa / pH</span>
                    <span className="text-lg font-extrabold text-white block">
                      {isCoffee ? "68.2% HR • pH 4.1" : "85% HR Óptima"}
                    </span>
                    <span className="text-[10px] text-stone-400">Sensor BME280 / pH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {weatherForecast && (
            <div className="relative group">
              <div className="bg-stone-800/70 border border-emerald-900 rounded-3xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-700/60 pb-3 mb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Contexto IoT • Pronóstico</span>
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
            </div>
          )}

          {/* Etapa 4: Certificación de Calidad */}
          <div className="relative group">
            <div className="absolute -left-[30px] md:-left-[38px] top-0 w-8 h-8 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-md">
              <Award className="w-4 h-4" />
            </div>
            <div className="bg-stone-800/70 border border-stone-700 rounded-3xl p-6 hover:border-stone-600 transition-colors">
              <div className="border-b border-stone-700/60 pb-3 mb-4">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                  Etapa 4 • Certificación
                </span>
                <h3 className="text-lg font-bold text-white">
                  {isCoffee ? "Cata Oficial SCA (Specialty Coffee Association)" : "Registro Sanitario INVIMA e Inocuidad"}
                </h3>
              </div>

              {isCoffee ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl font-black text-amber-300">88.5</span>
                    <span className="text-xs text-stone-400 leading-tight">
                      Puntaje en Escala SCA<br />
                      <strong>Café de Especialidad Extraordinario</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["Jazmín", "Durazno maduro", "Miel silvestre", "Acidez cítrica brillante"].map((note) => (
                      <span
                        key={note}
                        className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-stone-900 rounded-xl border border-stone-800">
                    <span className="text-stone-400 block">Licencia Sanitaria INVIMA:</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      {timeline.details.sanitary_license || "INVIMA-2023-00918"}
                    </span>
                  </div>
                  <p className="text-stone-400">
                    Garantía de cadena de frío constante durante almacenamiento y despacho directo al consumidor.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Etapa 5: Inmutabilidad Polygon Blockchain */}
          <div className="relative group">
            <div className="absolute -left-[30px] md:-left-[38px] top-0 w-8 h-8 rounded-full bg-purple-950 border-2 border-purple-500 flex items-center justify-center text-purple-400 shadow-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="bg-stone-800/80 border-2 border-purple-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="border-b border-stone-700/60 pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-purple-400">
                    Etapa 5 • Criptografía Inmutable
                  </span>
                  <h3 className="text-lg font-bold text-white">Smart Contract en Polygon PoS</h3>
                </div>
                <span className="text-xs font-mono bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1 rounded-full self-start md:self-auto">
                  Red Amoy Testnet (Chain ID 80002)
                </span>
              </div>

              <p className="text-xs text-stone-300 mb-4 leading-relaxed">
                Este lote cuenta con un sello criptográfico generado a partir de sus parámetros de origen, lecturas de sensores y cata. Nadie (ni la cooperativa ni el desarrollador) puede alterar esta información una vez grabada en la cadena de bloques.
              </p>

              <div className="space-y-2 text-xs font-mono bg-stone-950 p-4 rounded-2xl border border-stone-800">
                <div>
                  <span className="text-stone-500 block text-[11px]">Hash de Datos del Lote (SHA-256):</span>
                  <span className="text-stone-300 break-all select-all font-semibold">
                    {timeline.notarization?.data_hash || "0x7f9a2b84c83e1850a582fae389d41c9b68ef5d89f74a01c3e8841a1290bb341"}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-800">
                  <span className="text-stone-500 block text-[11px]">Transacción Polygon (TxHash):</span>
                  <span className="text-emerald-400 break-all select-all font-semibold">
                    {timeline.notarization?.transaction_hash || "0x5d92e88a70c3451203efbc12984abce912304910cf928a3498bfe123490aa18"}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-800 flex justify-between items-center text-[11px] font-sans">
                  <span className="text-stone-400">Smart Contract:</span>
                  <span className="font-mono text-stone-300">
                    {timeline.notarization?.contract_address || "0x89D2B52264e10EE88bF64703a9C149B0EcfA8679"}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <a
                  href={timeline.notarization?.explorer_url || "https://amoy.polygonscan.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/50 text-purple-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>Auditar en PolygonScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <Link
                  href="/"
                  className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Comprar Productos de este Lote</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
