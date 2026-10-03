import {
  Heart,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Layers,
  ArrowRight,
  Cpu,
  Award,
  QrCode
} from "lucide-react";
import Link from "next/link";
import { checkBackendHealth, getProducts, Product } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { CatalogSection } from "@/components/CatalogSection";

export const dynamic = "force-dynamic";

export default async function Home() {
  let backendStatus = {
    online: false,
    message: "Desconectado",
    version: undefined as string | undefined,
  };

  try {
    const health = await checkBackendHealth();
    backendStatus = {
      online: health.status === "online",
      message: health.message,
      version: health.version,
    };
  } catch {
    backendStatus = {
      online: false,
      message: "No disponible (Verifica que FastAPI esté en ejecución en el puerto 8000)",
      version: undefined,
    };
  }

  const products: Product[] = await getProducts();

  // Productos de demostración si la base de datos está offline
  const sampleProducts: Product[] = [
    {
      id: 1,
      batch_id: 1,
      name: "Café Geisha Huila - Edición Especial",
      description:
        "Cultivado a 1,850 msnm con fermentación anaeróbica de 48 horas. Notas a jazmín, durazno maduro y miel silvestre.",
      price: 180000,
      stock: 45,
      attributes: {
        category: "coffee",
        sca_score: 88.5,
        altitude: 1850,
        variety: "Geisha",
        process_method: "Anaeróbico 48h",
        cup_profile: ["Jazmín", "Durazno maduro", "Miel silvestre", "Acidez cítrica"],
      },
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
    {
      id: 2,
      batch_id: 2,
      name: "Chorizo Artesanal Campesino con Especias Andinas",
      description:
        "Derivado cárnico prémium elaborado con cortes seleccionados de cerdo huilense, ahumado natural con leña de café.",
      price: 38000,
      stock: 30,
      attributes: {
        category: "cured_meats",
        temperature_control: "2°C - 4°C",
        sanitary_registry: "RSA-0019283-2024",
        expiration_date: "30 días",
      },
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    },
  ];

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const displayedProducts = products.length > 0 || !isDemoMode ? products : sampleProducts;
  const isSample = isDemoMode && products.length === 0;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 pb-28 selection:bg-amber-200 selection:text-amber-950">
      {/* Navbar Superior */}
      <Navbar backendStatus={backendStatus} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-6 border-b border-stone-200/80 bg-gradient-to-b from-amber-50/40 via-stone-50 to-stone-50">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-bold tracking-wide shadow-xs mb-6">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>Trazabilidad Agrícola Inmutable con Polygon PoS & Sensores IoT</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-stone-950 max-w-4xl mx-auto leading-[1.08]">
            De la finca del Huila a tu mesa con{" "}
            <span className="bg-gradient-to-r from-emerald-800 to-emerald-600 bg-clip-text text-transparent">
              origen certificado
            </span>
          </h1>

          <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto mt-6 leading-relaxed font-normal">
            Eliminamos intermediarios permitiendo que productores de café especial y productos cárnicos certificados reciban hasta{" "}
            <strong className="text-stone-900 font-bold">$180,000 COP/kg</strong> por su calidad real y autenticidad auditable.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <a
              href="#catalogo"
              className="py-3 px-6 rounded-2xl bg-amber-950 hover:bg-amber-900 text-white font-bold text-sm transition-all shadow-md hover:shadow-xl active:scale-95"
            >
              Explorar Catálogo B2C
            </a>
            <Link
              href="/trace/1"
              className="py-3 px-6 rounded-2xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 font-bold text-sm transition-all shadow-xs flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Ver Pasaporte de Lote #1</span>
            </Link>
          </div>

          {/* 3 Pilares Tecnológicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16 text-left">
            <div className="p-7 bg-white rounded-3xl shadow-xs border border-stone-200/90 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-stone-900 mb-1.5">Trazabilidad Inmutable</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Cada lote registra altitud, humedad, método de beneficio y temperatura en contratos inteligentes de Polygon PoS.
              </p>
            </div>

            <div className="p-7 bg-white rounded-3xl shadow-xs border border-stone-200/90 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-stone-900 mb-1.5">Comercio Directo B2C</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Captura el valor de la premiumización hasta $180,000 COP/kg, conectando directamente al consumidor con el productor huilense.
              </p>
            </div>

            <div className="p-7 bg-white rounded-3xl shadow-xs border border-stone-200/90 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-stone-900 mb-1.5">Catálogo Híbrido</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Esquema flexible (JSONB) para café especial de alta cata y derivados cárnicos con monitoreo estricto de cadena de frío.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Paso a Paso Interactivo */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">
            Arquitectura de Confianza
          </span>
          <h2 className="text-3xl font-black text-stone-950 mt-1">
            ¿Cómo Funciona el Ecosistema CaféTrace IA?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs relative">
            <span className="text-4xl font-black text-stone-200 absolute top-4 right-4">01</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold mb-3">
              <Cpu className="w-5 h-5 text-amber-800" />
            </div>
            <h4 className="text-base font-bold text-stone-900 mb-1">Telemetría en Finca</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Nodos ESP32/LoRa con sondas DS18B20 monitorean la fermentación y clima en fincas del Huila sin depender de internet continuo.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs relative">
            <span className="text-4xl font-black text-stone-200 absolute top-4 right-4">02</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold mb-3">
              <Award className="w-5 h-5 text-emerald-800" />
            </div>
            <h4 className="text-base font-bold text-stone-900 mb-1">Certificación & Calidad</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Q-Graders auditan el puntaje SCA (88.5+) y los derivados cárnicos validan licencias INVIMA y cadena de frío (2°C - 4°C).
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs relative">
            <span className="text-4xl font-black text-stone-200 absolute top-4 right-4">03</span>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold mb-3">
              <ShieldCheck className="w-5 h-5 text-purple-800" />
            </div>
            <h4 className="text-base font-bold text-stone-900 mb-1">Notarización Polygon</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              El hash criptográfico del lote se graba de forma inmutable en la red Polygon PoS, garantizando que nadie pueda falsificar el origen.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs relative">
            <span className="text-4xl font-black text-stone-200 absolute top-4 right-4">04</span>
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center font-bold mb-3">
              <QrCode className="w-5 h-5 text-sky-800" />
            </div>
            <h4 className="text-base font-bold text-stone-900 mb-1">Código QR Dinámico</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              El consumidor escanea el empaque con su celular y accede al pasaporte digital verificando toda la historia antes de consumir.
            </p>
          </div>
        </div>
      </section>

      {/* Sección del Catálogo Dinámico */}
      <div id="catalogo">
        <CatalogSection products={displayedProducts} isSample={isSample} />
      </div>

      {/* Footer */}
      <footer className="mt-28 border-t border-stone-200 bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☕</span>
            <div>
              <span className="text-base font-black text-stone-950 block">CaféTrace IA</span>
              <span className="text-xs text-stone-400">
                Pitalito • Garzón • Neiva — Departamento del Huila, Colombia
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-stone-500 font-medium">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-900 transition-colors"
            >
              Documentación Swagger API
            </a>
            <a
              href="https://amoy.polygonscan.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-900 transition-colors"
            >
              Explorador Polygon PoS
            </a>
            <Link href="/trace/1" className="hover:text-stone-900 transition-colors">
              Pasaporte Demo Lote #1
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
