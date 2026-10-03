"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, ExternalLink, Copy, Check, ShieldCheck, Cpu } from "lucide-react";
import Link from "next/link";

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: number;
  productName: string;
  category?: string;
}

export function QrModal({ isOpen, onClose, batchId, productName, category }: QrModalProps) {
  const [qrSvg, setQrSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [traceUrl, setTraceUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/trace/${batchId}`;
      setTraceUrl(url);

      QRCode.toString(
        url,
        {
          type: "svg",
          margin: 2,
          color: {
            dark: "#1c1917", // stone-900
            light: "#ffffff",
          },
        },
        (err, svg) => {
          if (!err && svg) {
            setQrSvg(svg);
          }
        }
      );
    }
  }, [batchId]);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    if (traceUrl) {
      navigator.clipboard.writeText(traceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Header decorativo */}
        <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-emerald-950 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Certificado Polygon Blockchain
          </div>
          <h3 id="qr-modal-title" className="text-xl font-black tracking-tight">{productName}</h3>
          <p className="text-xs text-amber-200/80 mt-1 font-mono">
            Trazabilidad Inmutable • Lote #{batchId}
          </p>
        </div>

        {/* Cuerpo del QR */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="p-4 bg-stone-50 rounded-2xl border-2 border-dashed border-amber-200/80 shadow-inner flex items-center justify-center">
            {qrSvg ? (
              <div
                className="w-52 h-52 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-xs text-stone-400">
                Generando QR Dinámico...
              </div>
            )}
          </div>

          <p className="text-xs text-stone-500 mt-4 max-w-xs leading-relaxed">
            Escanea este código desde la cámara de tu smartphone para acceder al registro público de sensores IoT y firma en Polygon.
          </p>

          <div className="w-full flex items-center gap-2 mt-4 p-2.5 bg-stone-100 rounded-xl text-xs font-mono text-stone-600 border border-stone-200">
            <span className="truncate flex-1 text-left">{traceUrl}</span>
            <button
              onClick={copyToClipboard}
              className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg font-sans font-semibold text-stone-800 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              title="Copiar enlace"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <Link
              href={`/trace/${batchId}`}
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Ver Trazabilidad</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-amber-700" /> Nodo ESP32 Huila
          </span>
          <span className="font-mono text-emerald-700 font-semibold">Polygon PoS #80002</span>
        </div>
      </div>
    </div>
  );
}
