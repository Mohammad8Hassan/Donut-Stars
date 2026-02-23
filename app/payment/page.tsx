"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDispatch } from "react-redux";

import { authFetch } from "@/app/api/authFetch";
import { useAppSelector } from "../store/hooks";
import { clearCart, selectCartItems, selectCartTotal } from "../store/cartSlice";

type Address = {
  id: number;
  label: string | null;
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  postal_code: string | null;
  country: string;
  is_default: boolean | number | string;
};

type PaymentState = {
  cardNumber: string;
  expiry: string;
  cvc: string;
};

export default function PaymentPage(): JSX.Element {
  const dispatch = useDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartTotal);

  const shipping = subtotal > 20 ? 0 : 2.5;
  const total = +(subtotal + shipping).toFixed(2);

  // Payment input state (demo-only card form).
  const [form, setForm] = useState<PaymentState>({
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  // Address state loaded from the same /api/addresses source used in account page.
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PaymentState, string>>>({});

  function update<K extends keyof PaymentState>(key: K, value: PaymentState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // Normalize DB-backed default flag (can arrive as boolean/0/1/string).
  function isDefaultAddress(value: Address["is_default"]) {
    return value === true || value === 1 || value === "1";
  }

  const loadAddresses = useCallback(async () => {
    setLoadingAddresses(true);

    try {
      const res = await authFetch("/api/addresses", { cache: "no-store" });

      if (!res.ok) {
        throw new Error("Failed to load addresses");
      }

      const data = await res.json();
      const rows = (data.addresses ?? []) as Address[];

      const normalized = rows.map((addr) => ({
        ...addr,
        is_default: isDefaultAddress(addr.is_default),
      }));

      setAddresses(normalized);

      // Prefer the default address, otherwise first one.
      const defaultAddress = normalized.find((a) => a.is_default);
      setSelectedAddressId(defaultAddress?.id ?? normalized[0]?.id ?? null);
    } catch {
      setError("Failed to load addresses. Please try again.");
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  function validate(): Partial<Record<keyof PaymentState, string>> {
    const errors: Partial<Record<keyof PaymentState, string>> = {};

    if (!/^\d{13,19}$/.test(form.cardNumber.replace(/\s+/g, ""))) {
      errors.cardNumber = "Enter a valid card number.";
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) {
      errors.expiry = "Expiry must be MM/YY.";
    }

    if (!/^\d{3,4}$/.test(form.cvc)) {
      errors.cvc = "CVC must be 3 or 4 digits.";
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedAddressId) {
      setError("Please choose a delivery address.");
      return;
    }

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const v = validate();
    if (Object.keys(v).length > 0) {
      setFieldErrors(v);
      return;
    }

    setFieldErrors({});
    setProcessing(true);

    try {
      // Place order using selected saved address + cart items.
      const res = await authFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedAddressId,
          items: cartItems,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to place order.");
      }

      const data = await res.json();
      setSuccess(`Order #${data.orderId} placed successfully.`);
      dispatch(clearCart());
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-pink-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-pink-300 opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-purple-300 opacity-20 blur-3xl" />

        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="black" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="mx-auto max-w-5xl py-10 px-4 flex flex-col gap-8">
        <h1 className="text-3xl font-bold mb-2">Payment</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form
            onSubmit={handleSubmit}
            className="md:col-span-2 bg-white rounded-xl shadow-sm p-6 border"
          >
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold">Delivery Address</h2>
              <Link href="/account/addresses" className="text-sm text-pink-600 hover:underline">
                Manage Addresses
              </Link>
            </div>

            {loadingAddresses && <p className="text-sm text-gray-500 mb-4">Loading addresses...</p>}

            {!loadingAddresses && addresses.length === 0 && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                No saved addresses found. Add one before placing your order.
              </div>
            )}

            {!loadingAddresses && addresses.length > 0 && (
              <div className="mb-6 flex flex-col gap-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`rounded-lg border p-3 cursor-pointer ${
                      selectedAddressId === addr.id ? "border-pink-500 bg-pink-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="selectedAddress"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <p className="font-medium">
                          {addr.label ?? "Address"}
                          {isDefaultAddress(addr.is_default) && (
                            <span className="ml-2 text-xs text-pink-600 font-semibold">DEFAULT</span>
                          )}
                        </p>
                        <p>{addr.full_name}</p>
                        <p>{addr.phone}</p>
                        <p>
                          {addr.line1}, {addr.city}
                        </p>
                        {addr.postal_code && <p>{addr.postal_code}</p>}
                        <p>{addr.country}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <h2 className="text-xl font-semibold mt-6 mb-4">Payment Details (Demo Only)</h2>

            <label className="block mb-4">
              <span className="block text-sm mb-1">Card Number</span>
              <input
                className={`w-full border rounded-lg px-3 py-2 ${fieldErrors.cardNumber ? "border-red-500" : "border-gray-300"}`}
                value={form.cardNumber}
                onChange={(e) => update("cardNumber", e.target.value)}
                placeholder="4242 4242 4242 4242"
              />
              {fieldErrors.cardNumber && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.cardNumber}</p>
              )}
            </label>

            <div className="flex gap-4">
              <label className="block flex-1 mb-4">
                <span className="block text-sm mb-1">Expiry (MM/YY)</span>
                <input
                  className={`w-full border rounded-lg px-3 py-2 ${fieldErrors.expiry ? "border-red-500" : "border-gray-300"}`}
                  value={form.expiry}
                  onChange={(e) => update("expiry", e.target.value)}
                  placeholder="12/25"
                />
                {fieldErrors.expiry && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.expiry}</p>
                )}
              </label>

              <label className="block w-32 mb-4">
                <span className="block text-sm mb-1">CVC</span>
                <input
                  className={`w-full border rounded-lg px-3 py-2 ${fieldErrors.cvc ? "border-red-500" : "border-gray-300"}`}
                  value={form.cvc}
                  onChange={(e) => update("cvc", e.target.value)}
                  placeholder="123"
                />
                {fieldErrors.cvc && <p className="text-red-500 text-sm mt-1">{fieldErrors.cvc}</p>}
              </label>
            </div>

            <button
              type="submit"
              disabled={
                processing ||
                cartItems.length === 0 ||
                loadingAddresses ||
                !selectedAddressId
              }
              className="mt-4 w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600 disabled:opacity-50"
            >
              {processing ? "Processing..." : `Pay $${total}`}
            </button>

            {error && <div className="text-red-600 mt-3">{error}</div>}
            {success && <div className="text-green-600 mt-3">{success}</div>}
          </form>

          <aside className="bg-white rounded-xl shadow-sm p-6 border h-fit">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

            {cartItems.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              <>
                <ul className="divide-y">
                  {cartItems.map((item) => (
                    <li key={item.id + (item.boxID ?? "")} className="py-3 flex justify-between">
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-semibold mt-3 pt-3 border-t">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Demo payment form only. Order is saved in database.
                </p>
              </>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
