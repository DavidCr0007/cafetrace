"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { QrModal } from "@/components/QrModal";
import {
  Award,
  Snowflake,
  MapPin,
  Tag,
  ShoppingBag,
  QrCode,
  ExternalLink,
  Plus,
  ShieldCheck,
  Check
} from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isCoffee =
    product.attributes?.category === "coffee" || product.attributes?.sca_score !== undefined;
  const isMeat =
    product.attributes?.category === "cured_meats" ||
    product.attributes?.temperature_control !== undefined;

  const formattedPrice = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(product.price);

  const handleAddToCart = () => {
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <>
      <div className="group flex flex-col bg-white rounded-3xl shadow-xs hover:shadow-xl border border-stone-200/90 overflow-hidden transition-all duration-300 hover:-translate-y-1">
        {/* Cabecera / Imagen con Badge */}
        <div className="relative h-56 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100 flex items-center justify-center p-4 overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              unoptimized
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 select-none">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
                  isCoffee
                    ? "bg-amber-100/70 text-amber-900 border border-amber-200"
                    : "bg-rose-100/70 text-rose-900 border border-rose-200"
                }`}
              >
                {isCoffee ? (
                  <span className="text-2xl font-serif">☕</span>
                ) : (
                  <span className="text-2xl">🥩</span>
                )}
              </div>
              <span className="text-[11px] uppercase tracking-widest font-black text-stone-500">
                {isCoffee ? "Café de Especialidad Huila" : "Derivado Cárnico Certificado"}
              </span>
            </div>
          )}

          {/* Badges superiores flotantes */}
          <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5">
            {product.attributes?.sca_score && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 border border-amber-300 shadow-sm">
                <Award className="w-3.5 h-3.5 text-amber-950" />
                {product.attributes.sca_score} SCA
              </span>
            )}

            {product.attributes?.temperature_control && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300 shadow-xs">
                <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                {product.attributes.temperature_control}
              </span>
            )}
          </div>

          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="p-2 rounded-xl bg-white/95 hover:bg-white text-stone-700 shadow-md border border-stone-200/80 hover:text-emerald-700 transition-all cursor-pointer"
              title="Ver Código QR para escanear en celular"
              aria-label="Ver Código QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <span className="text-xs px-2.5 py-1 rounded-xl bg-stone-900/90 text-white font-mono font-medium shadow-md backdrop-blur-xs">
              Lote #{product.batch_id}
            </span>
          </div>
        </div>

        {/* Cuerpo de la tarjeta */}
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verificación Polygon Inmutable</span>
            </div>

            <h3 className="text-xl font-black text-stone-900 tracking-tight line-clamp-1 group-hover:text-amber-950 transition-colors">
              {product.name}
            </h3>

            <p className="text-xs text-stone-500 mt-2 leading-relaxed line-clamp-2">
              {product.description ||
                "Producto con trazabilidad verificable en blockchain y telemetría de sensores en origen."}
            </p>

            {/* Atributos dinámicos */}
            <div className="mt-4 flex flex-wrap gap-1.5 text-xs text-stone-600">
              {product.attributes?.variety && (
                <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-lg">
                  <Tag className="w-3 h-3 text-stone-400" />
                  {product.attributes.variety}
                </span>
              )}
              {product.attributes?.altitude && (
                <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-lg">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  {product.attributes.altitude} msnm
                </span>
              )}
              {product.attributes?.process_method && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                  {product.attributes.process_method}
                </span>
              )}
              {product.attributes?.sanitary_registry && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium">
                  INVIMA: {product.attributes.sanitary_registry}
                </span>
              )}
            </div>

            {/* Perfil de Taza en Café */}
            {product.attributes?.cup_profile && (
              <div className="mt-3 flex flex-wrap gap-1">
                {product.attributes.cup_profile.slice(0, 3).map((note: string) => (
                  <span
                    key={note}
                    className="text-[10px] font-medium bg-stone-50 border border-stone-200 text-stone-600 px-2 py-0.5 rounded-md"
                  >
                    • {note}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Precio y Acciones */}
          <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase font-bold tracking-wider text-stone-400">
                Precio Productor
              </span>
              <span className="text-2xl font-black text-stone-900 tracking-tight">
                {formattedPrice}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/trace/${product.batch_id}`}
                className="py-2.5 px-3 rounded-xl border border-stone-200 hover:border-emerald-700 hover:bg-emerald-50/50 text-stone-700 hover:text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Trazabilidad</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleAddToCart}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                  justAdded
                    ? "bg-emerald-700 text-white"
                    : "bg-amber-900 hover:bg-amber-800 text-white"
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>¡Agregado!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Comprar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Código QR Dinámico */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        batchId={product.batch_id}
        productName={product.name}
        category={product.attributes?.category}
      />
    </>
  );
}
