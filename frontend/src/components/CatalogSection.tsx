"use client";

import React, { useState } from "react";
import { Product } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { QrCode, Filter, Sparkles } from "lucide-react";

interface CatalogSectionProps {
  products: Product[];
  isSample: boolean;
}

export function CatalogSection({ products, isSample }: CatalogSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "coffee" | "cured_meats">("all");

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "coffee") {
      return p.attributes?.category === "coffee" || p.attributes?.sca_score !== undefined;
    }
    if (selectedCategory === "cured_meats") {
      return p.attributes?.category === "cured_meats" || p.attributes?.temperature_control !== undefined;
    }
    return true;
  });

  return (
    <section className="max-w-7xl mx-auto px-6 pt-12">
      {/* Encabezado del catálogo y filtros */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-stone-200 gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-extrabold text-emerald-700">
            <QrCode className="w-4 h-4" />
            <span>Comercio Directo Sin Intermediarios</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-stone-950 mt-1 tracking-tight">
            Catálogo de Productos Certificados
          </h2>
          <p className="text-xs md:text-sm text-stone-500 mt-1 max-w-xl">
            Cada producto cuenta con un lote único respaldado por telemetría IoT y sello inmutable en Polygon PoS.
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
            <span>☕ Café Especial SCA</span>
          </button>

          <button
            type="button"
            aria-pressed={selectedCategory === "cured_meats"}
            onClick={() => setSelectedCategory("cured_meats")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "cured_meats"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>🥩 Cárnicos y Embutidos</span>
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
        <div className="p-12 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-300">
          <Filter className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-700">No hay productos en esta categoría</p>
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
