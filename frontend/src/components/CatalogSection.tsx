"use client";

import React, { useState } from "react";
import { Product, ProductType } from "@/lib/api";
import { productCategory } from "@/lib/traceability";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";
import { CircleAlert, QrCode, Filter } from "lucide-react";

interface CatalogSectionProps {
  products: Product[];
  isSample: boolean;
  backendOnline: boolean;
}

export function CatalogSection({ products, isSample, backendOnline }: CatalogSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | ProductType>("all");

  const filteredProducts = products.filter((p) => selectedCategory === "all" || productCategory(p) === selectedCategory);

  return (
    <section className="mx-auto max-w-7xl px-5 pt-16 sm:px-8">
      {!backendOnline && (
        <div role="status" className="mb-8 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-black">Inventario temporalmente no disponible</p>
              <p className="mt-1 text-xs leading-5 text-amber-900/75">
                La API o PostgreSQL no respondió a la comprobación de disponibilidad. {isSample ? "Los productos visibles son muestras de interfaz." : "No se muestran datos para evitar confundir una caída con un catálogo vacío."}
              </p>
            </div>
          </div>
          <Link href="/diagnostics" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-black text-amber-950 transition hover:border-amber-500">
            Abrir diagnóstico
          </Link>
        </div>
      )}
      {/* Encabezado del catálogo y filtros */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-stone-200 gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-extrabold text-emerald-700">
            <QrCode className="w-4 h-4" />
            <span>Catálogo conectado a lotes</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-stone-950 mt-1 tracking-tight">
            Productos con historia consultable
          </h2>
          <p className="text-xs md:text-sm text-stone-500 mt-1 max-w-xl">
            Consulta la información disponible de cada lote. El pasaporte distingue evidencia declarada, registrada y verificada.
          </p>
        </div>

        {/* Pestañas de Filtro */}
        <div className="flex items-center gap-1.5 p-1.5 bg-stone-100/80 rounded-2xl border border-stone-200 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            aria-pressed={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Todos ({products.length})
          </button>

          <button
            type="button"
            aria-pressed={selectedCategory === "coffee"}
            onClick={() => setSelectedCategory("coffee")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "coffee"
                ? "bg-amber-950 text-white shadow-xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>☕ Café especial</span>
          </button>

          <button
            type="button"
            aria-pressed={selectedCategory === "meat"}
            onClick={() => setSelectedCategory("meat")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "meat"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>🥩 Cárnicos</span>
          </button>
        </div>
      </div>

      {/* Grid de Productos */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
          <Filter className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-700">{backendOnline ? "Aún no hay productos en esta categoría" : "No fue posible consultar el inventario"}</p>
          <p className="mt-1 text-xs text-stone-500">{backendOnline ? "Prueba con otra categoría o vuelve cuando se publique inventario." : "Inicia PostgreSQL y la API; después recarga esta página."}</p>
          <button
            onClick={() => setSelectedCategory("all")}
            className="mt-3 px-4 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl"
          >
            Ver todos los productos
          </button>
        </div>
      )}
    </section>
  );
}
