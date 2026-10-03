"use client";

import React from "react";
import Link from "next/link";
import { Activity, ShoppingBag, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface NavbarProps {
  backendStatus: {
    online: boolean;
    message: string;
    version?: string;
  };
}

export function Navbar({ backendStatus }: NavbarProps) {
  const { openCart, totalItems } = useCart();

  return (
    <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-950 to-stone-900 flex items-center justify-center text-amber-400 font-serif text-xl font-bold shadow-md shadow-amber-950/10 group-hover:scale-105 transition-transform">
            ☕
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-stone-950">
                CaféTrace <span className="text-emerald-700">IA</span>
              </span>
              <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 font-bold border border-emerald-200/70">
                Huila B2B & B2C
              </span>
            </div>
            <span className="text-[10px] text-stone-400 font-medium block">
              Trazabilidad Inmutable & E-commerce Directo
            </span>
          </div>
        </Link>

        {/* Acciones derecha */}
        <div className="flex items-center gap-4">
          {/* Estado Backend */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <Activity
              className={`w-3.5 h-3.5 ${
                backendStatus.online ? "text-emerald-600 animate-pulse" : "text-amber-500"
              }`}
            />
            <span className="text-stone-400">FastAPI:</span>
            {backendStatus.online ? (
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[11px]">
                Online (v{backendStatus.version})
              </span>
            ) : (
              <span
                className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 text-[11px]"
                title={backendStatus.message}
              >
                Local Mock
              </span>
            )}
          </div>

          {/* Botón de Trazabilidad Rápida */}
          <Link
            href="/trace/1"
            className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-emerald-800 bg-stone-100 hover:bg-emerald-50/60 border border-stone-200 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ver Demo Lote #1</span>
          </Link>
          <Link href="/admin" className="hidden lg:inline text-xs font-bold text-stone-600 hover:text-emerald-800">Admin</Link>
          <Link href="/dashboard" className="hidden lg:inline text-xs font-bold text-stone-600 hover:text-emerald-800">Dashboard</Link>

          {/* Botón Carrito */}
          <button
            type="button"
            onClick={openCart}
            className="relative flex items-center gap-2 px-4 py-2 bg-amber-950 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer hover:shadow-lg active:scale-95"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Carrito</span>
            {totalItems > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-stone-950 font-black text-[11px] flex items-center justify-center animate-in zoom-in-50">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
