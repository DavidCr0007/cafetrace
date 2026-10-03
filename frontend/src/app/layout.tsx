import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { CartDrawer } from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: "CaféTrace IA - Ecosistema de Trazabilidad y E-commerce Prémium",
  description: "Plataforma de trazabilidad agrícola inmutable con Polygon PoS, telemetría IoT y venta directa B2C del Huila.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
