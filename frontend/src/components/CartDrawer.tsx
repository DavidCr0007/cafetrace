"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { createOrder, OrderCreatePayload } from "@/lib/api";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Truck,
  ShieldCheck,
  CreditCard,
  MapPin,
  Phone,
  User,
  Mail,
  Loader2
} from "lucide-react";

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalPrice,
    totalItems,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formulario
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "Pitalito",
    department: "Huila",
    payment_method: "contra_entrega",
    notes: "",
  });

  if (!isOpen) return null;

  const formattedTotal = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(totalPrice);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Tu carrito está vacío");
      return;
    }

    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      setErrorMessage("Por favor completa todos los campos requeridos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: OrderCreatePayload = {
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        shipping_address: formData.address,
        city: formData.city,
        department: formData.department,
        payment_method: formData.payment_method,
        notes: formData.notes,
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };

      const res = await createOrder(payload);
      setOrderCompleted(res);
      clearCart();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar el pedido. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setOrderCompleted(null);
    setIsCheckingOut(false);
    closeCart();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-200"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-900" />
              <h2 id="cart-drawer-title" className="text-lg font-extrabold text-stone-900">
                {orderCompleted
                  ? "Pedido Confirmado"
                  : isCheckingOut
                  ? "Finalizar Compra Directa"
                  : `Tu Carrito (${totalItems})`}
              </h2>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-500 transition-colors cursor-pointer"
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pantalla de Éxito de Orden */}
          {orderCompleted ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
                ¡Gracias por apoyar al productor!
              </span>
              <h3 className="text-2xl font-black text-stone-900">
                Orden #{orderCompleted.id} Registrada
              </h3>
              <p className="text-xs text-stone-500 mt-2 max-w-xs leading-relaxed">
                Hemos enviado la confirmación a <strong>{orderCompleted.customer_email}</strong>. Tu pedido se despachará directamente desde el Huila.
              </p>

              <div className="w-full bg-stone-50 rounded-2xl p-4 border border-stone-200 mt-6 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Destinatario:</span>
                  <span className="font-semibold text-stone-800">{orderCompleted.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Dirección:</span>
                  <span className="font-semibold text-stone-800">{orderCompleted.shipping_address}, {orderCompleted.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Método de Pago:</span>
                  <span className="font-semibold text-stone-800 capitalize">{orderCompleted.payment_method.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 text-sm">
                  <span className="font-bold text-stone-800">Total a pagar:</span>
                  <span className="font-black text-emerald-800">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(orderCompleted.total_amount)}
                  </span>
                </div>
              </div>

              <button
                onClick={resetAll}
                className="w-full mt-6 py-3 px-4 bg-amber-900 hover:bg-amber-800 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Seguir Explorando el Catálogo
              </button>
            </div>
          ) : isCheckingOut ? (
            /* Formulario de Checkout */
            <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col justify-between overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                  <Truck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Despacho directo desde origen (Huila). Sin intermediarios para garantizar frescura y precio justo.
                  </span>
                </div>

                {errorMessage && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Nombre y Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Juan Valenzuela"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> Correo *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> WhatsApp / Celular *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="3151234567"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Dirección de Entrega *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Calle, Carrera, Edificio, Apto..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Municipio / Ciudad *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Pitalito, Neiva, Bogotá..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Departamento</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" /> Método de Pago
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="contra_entrega">Pago Contra Entrega (Efectivo/Nequi al recibir)</option>
                    <option value="transferencia">Transferencia Inmediata (Bancolombia / PSE)</option>
                  </select>
                </div>
              </div>

              {/* Botones de acción checkout */}
              <div className="pt-6 border-t border-stone-200 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold text-stone-500">Total con envío:</span>
                  <span className="text-xl font-black text-stone-900">{formattedTotal}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCheckingOut(false)}
                    className="py-2.5 px-4 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirmando...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirmar Pedido Directo</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Vista Normal del Carrito */
            <div className="flex-1 flex flex-col justify-between overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                  <ShoppingBag className="w-12 h-12 text-stone-300 mb-3" />
                  <h4 className="text-base font-bold text-stone-800">Tu carrito está vacío</h4>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs">
                    Descubre café de especialidad y cárnicos certificados cultivados y producidos en el Huila.
                  </p>
                  <button
                    onClick={closeCart}
                    className="mt-5 py-2 px-4 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Explorar Productos
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {items.map(({ product, quantity }) => {
                    const priceFormatted = new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(product.price);

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-200"
                      >
                        <div className="w-14 h-14 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              width={56}
                              height={56}
                              unoptimized
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-stone-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {product.name}
                          </h4>
                          <span className="text-xs font-extrabold text-stone-700 block mt-0.5">
                            {priceFormatted}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium">
                            Lote #{product.batch_id} verificado
                          </span>
                        </div>

                        {/* Modificadores de cantidad */}
                        <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="p-1 rounded hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold px-1 min-w-4 text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="p-1 rounded hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          aria-label="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Subtotal y Botón Checkout */}
              {items.length > 0 && (
                <div className="p-6 border-t border-stone-200 bg-stone-50">
                  <div className="space-y-1.5 mb-4 text-xs">
                    <div className="flex justify-between text-stone-500">
                      <span>Subtotal productos:</span>
                      <span className="font-semibold text-stone-800">{formattedTotal}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>Envío Huila / Nacional:</span>
                      <span className="text-emerald-700 font-bold">¡Gratis por lanzamiento!</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-stone-200">
                      <span>Total:</span>
                      <span className="text-emerald-800 text-lg">{formattedTotal}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full py-3 px-4 bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceder al Pago Directo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-stone-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pago protegido y trazabilidad garantizada</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
