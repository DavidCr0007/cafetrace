"use client";

import React from "react";
import Link from "next/link";
import { Activity, LayoutDashboard, ShoppingBag } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f5ef]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="CaféTrace, página principal">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-stone-950 text-xs font-black tracking-tight text-emerald-300 shadow-md shadow-stone-950/10 transition-transform group-hover:-rotate-3">
            CT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-stone-950 sm:text-xl">
                CaféTrace
              </span>
              <span className="hidden rounded-full border border-emerald-200 bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 sm:inline-block">
                Piloto controlado
              </span>
            </div>
            <span className="block text-[10px] font-medium text-stone-500">
              Evidencia de origen y operación
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 text-xs md:flex" title={backendStatus.message}>
            <Activity
              className={`w-3.5 h-3.5 ${
                backendStatus.online ? "text-emerald-600" : "text-amber-600"
              }`}
            />
            <span className="text-stone-500">API</span>
            {backendStatus.online ? (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                Operativa{backendStatus.version ? ` · v${backendStatus.version}` : ""}
              </span>
            ) : (
              <span
                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
              >
                Sin conexión
              </span>
            )}
          </div>

          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white/70 px-3 py-2.5 text-xs font-bold text-stone-700 transition hover:border-emerald-700 hover:text-emerald-800" aria-label="Abrir dashboard">
            <LayoutDashboard className="h-4 w-4" /><span className="hidden lg:inline">Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={openCart}
            className="relative flex items-center gap-2 rounded-xl bg-stone-950 px-3 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-stone-800 sm:px-4"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-300" />
            <span className="hidden sm:inline">Carrito</span>
            {totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300 text-[11px] font-black text-stone-950">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
