"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { CreditCard, MapPin, Receipt } from "lucide-react";

import { authFetch } from "@/app/api/authFetch";
import { useAuth } from "@/app/context/useAuth";
import { addGuestOrder } from "@/lib/guestOrders";
import { PageLoader } from "@/app/components/PageLoader";
import { useAppSelector } from "../store/hooks";
import { clearCart, selectCartItems, selectCartTotal } from "../store/cartSlice";
import { orderApi } from "../store/orderApi";

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
  paymentMethod: string;
};

type GuestAddressState = {
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  postal_code: string;
  country: string;
};

const emptyGuestAddress = (): GuestAddressState => ({
  full_name: "",
  phone: "",
  line1: "",
  city: "",
  postal_code: "",
  country: "",
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const formatCvc = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export default function PaymentPage(): JSX.Element {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, checked } = useAuth();
  const isGuest = checked && !user;
  const cartItems = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartTotal);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const shipping = cartItems.length === 0 ? 0 : subtotal > 20 ? 0 : 2.5;
  const total = +(subtotal + shipping).toFixed(2);

  const [form, setForm] = useState<PaymentState>({
    cardNumber: "",
    expiry: "",
    cvc: "",
    paymentMethod: "demo-card",
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [guestAddress, setGuestAddress] = useState<GuestAddressState>(emptyGuestAddress());
  const [guestAddressErrors, setGuestAddressErrors] = useState<Partial<Record<keyof GuestAddressState, string>>>({});

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PaymentState, string>>>({});

  const orderPlacedRef = useRef(false);

  function updateGuestAddress<K extends keyof GuestAddressState>(key: K, value: GuestAddressState[K]) {
    setGuestAddress((p) => ({ ...p, [key]: value }));
  }

  function update<K extends keyof PaymentState>(key: K, value: PaymentState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

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

      const defaultAddress = normalized.find((a) => a.is_default);
      setSelectedAddressId(defaultAddress?.id ?? normalized[0]?.id ?? null);
    } catch {
      setError("Failed to load addresses. Please try again.");
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (!checked) return;

    if (isGuest) {
      setLoadingAddresses(false);
      return;
    }

    loadAddresses();
  }, [checked, isGuest, loadAddresses]);

  useEffect(() => {
    if (!checked || orderPlacedRef.current) return;

    if (cartItems.length === 0) {
      router.replace("/checkout");
    }
  }, [checked, cartItems.length, router]);

  useEffect(() => {
    if (form.paymentMethod === "cash-on-delivery") {
      setFieldErrors((current) => ({
        ...current,
        cardNumber: undefined,
        expiry: undefined,
        cvc: undefined,
      }));
    }
  }, [form.paymentMethod]);

  function validate(): Partial<Record<keyof PaymentState, string>> {
    const errors: Partial<Record<keyof PaymentState, string>> = {};

    if (form.paymentMethod === "cash-on-delivery") {
      return errors;
    }

    if (!/^\d{13,19}$/.test(form.cardNumber.replace(/\s+/g, ""))) {
      errors.cardNumber = "Enter a valid card number.";
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) {
      errors.expiry = "Enter expiry as MM/YY.";
    }

    if (!/^\d{3,4}$/.test(form.cvc)) {
      errors.cvc = "Enter a valid CVC.";
    }

    return errors;
  }

  const payButtonLabel = useMemo(() => {
    if (processing) return "Processing...";
    if (success) return "Order placed";
    if (form.paymentMethod === "cash-on-delivery") return "Place Order";
    return `Pay ${formatCurrency(total)}`;
  }, [form.paymentMethod, processing, success, total]);

  function validateGuestAddress(): Partial<Record<keyof GuestAddressState, string>> {
    const errors: Partial<Record<keyof GuestAddressState, string>> = {};

    if (!guestAddress.full_name.trim()) errors.full_name = "Enter your full name.";
    if (!guestAddress.phone.trim()) errors.phone = "Enter a phone number.";
    if (!guestAddress.line1.trim()) errors.line1 = "Enter your street address.";
    if (!guestAddress.city.trim()) errors.city = "Enter your city.";
    if (!guestAddress.country.trim()) errors.country = "Enter your country.";

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isGuest) {
      const addressErrors = validateGuestAddress();
      if (Object.keys(addressErrors).length > 0) {
        setGuestAddressErrors(addressErrors);
        setError("Please fill in your delivery address.");
        return;
      }
      setGuestAddressErrors({});
    } else if (!selectedAddressId) {
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
      const cardNumber = form.cardNumber.replace(/\s+/g, "");

      const res = await authFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isGuest
            ? {
                address: {
                  full_name: guestAddress.full_name.trim(),
                  phone: guestAddress.phone.trim(),
                  line1: guestAddress.line1.trim(),
                  city: guestAddress.city.trim(),
                  postal_code: guestAddress.postal_code.trim() || null,
                  country: guestAddress.country.trim(),
                },
              }
            : { addressId: selectedAddressId }),
          items: cartItems,
          payment: {
            method: form.paymentMethod,
            provider: form.paymentMethod === "cash-on-delivery" ? "cash" : "demo",
            last4: form.paymentMethod === "cash-on-delivery" ? undefined : cardNumber.slice(-4),
            reference: `${form.paymentMethod}_${crypto.randomUUID()}`,
            metadata:
              form.paymentMethod === "cash-on-delivery"
                ? { type: "cash-on-delivery" }
                : { expiry: form.expiry },
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to place order.");
      }

      const data = await res.json();
      orderPlacedRef.current = true;
      setSuccess(`Order #${data.orderId} placed successfully.`);
      setPlacedOrderId(data.orderId ?? null);

      if (isGuest && data.orderId) {
        addGuestOrder(String(data.orderId), guestAddress.phone.trim());
      } else if (!isGuest) {
        // Refetch the navbar's active-orders query right away instead of
        // waiting for its next 15s poll.
        dispatch(orderApi.util.invalidateTags(["ActiveOrders"]));
      }

      dispatch(clearCart());
      isGuest ? router.replace("/") : router.replace("/account/active-orders");
    } catch (err: any) {
      console.error("Order placement error:", err);
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  }

  if (!checked || (cartItems.length === 0 && !orderPlacedRef.current)) {
    return (
      <main className="relative isolate overflow-hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <section className="overflow-hidden rounded-[32px] border border-rose-100 bg-white/85 shadow-[0_28px_70px_rgba(15,23,42,0.10)] backdrop-blur">
            <PageLoader title="Preparing checkout" message="Hang tight while we get things ready." />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate overflow-hidden">



      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="overflow-hidden rounded-[32px] border border-rose-100 bg-white/85 shadow-[0_28px_70px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="bg-gradient-to-br from-rose-50 via-white to-amber-50 px-6 py-8 sm:px-8">
            <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Payment</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
              Choose a delivery address, select your payment method, and place your order.
            </p>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6"
          >
            <section className="border-b border-zinc-100 pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_16px_34px_rgba(244,63,94,0.28)]">
                    <MapPin className="h-6 w-6" strokeWidth={2.1} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">Delivery</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">Choose your address</h2>
                  </div>
                </div>
                {!isGuest && (
                  <Link
                    href="/account/addresses"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:bg-rose-50"
                  >
                    Manage Addresses
                  </Link>
                )}
              </div>

              {isGuest ? (
                <div className="mt-5">
                  <p className="text-sm text-zinc-600">
                    Checking out as a guest. Enter your delivery details below, or{" "}
                    <Link href="/login" className="font-semibold text-rose-600 underline">
                      log in
                    </Link>{" "}
                    to use a saved address.
                  </p>

                  <div className="mt-4 grid gap-4 rounded-[28px] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Full Name</span>
                        <input
                          value={guestAddress.full_name}
                          onChange={(e) => updateGuestAddress("full_name", e.target.value)}
                          placeholder="Full name"
                          className={`w-full rounded-2xl border px-4 py-3 text-zinc-900 outline-none transition ${guestAddressErrors.full_name ? "border-red-500" : "border-zinc-300 focus:border-rose-300"}`}
                        />
                        {guestAddressErrors.full_name && <p className="mt-1 text-sm text-red-500">{guestAddressErrors.full_name}</p>}
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Phone</span>
                        <input
                          value={guestAddress.phone}
                          onChange={(e) => updateGuestAddress("phone", e.target.value)}
                          placeholder="Phone number"
                          className={`w-full rounded-2xl border px-4 py-3 text-zinc-900 outline-none transition ${guestAddressErrors.phone ? "border-red-500" : "border-zinc-300 focus:border-rose-300"}`}
                        />
                        {guestAddressErrors.phone && <p className="mt-1 text-sm text-red-500">{guestAddressErrors.phone}</p>}
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Address Line</span>
                      <input
                        value={guestAddress.line1}
                        onChange={(e) => updateGuestAddress("line1", e.target.value)}
                        placeholder="Street, building, unit..."
                        className={`w-full rounded-2xl border px-4 py-3 text-zinc-900 outline-none transition ${guestAddressErrors.line1 ? "border-red-500" : "border-zinc-300 focus:border-rose-300"}`}
                      />
                      {guestAddressErrors.line1 && <p className="mt-1 text-sm text-red-500">{guestAddressErrors.line1}</p>}
                    </label>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-zinc-700">City</span>
                        <input
                          value={guestAddress.city}
                          onChange={(e) => updateGuestAddress("city", e.target.value)}
                          placeholder="City"
                          className={`w-full rounded-2xl border px-4 py-3 text-zinc-900 outline-none transition ${guestAddressErrors.city ? "border-red-500" : "border-zinc-300 focus:border-rose-300"}`}
                        />
                        {guestAddressErrors.city && <p className="mt-1 text-sm text-red-500">{guestAddressErrors.city}</p>}
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Postal Code</span>
                        <input
                          value={guestAddress.postal_code}
                          onChange={(e) => updateGuestAddress("postal_code", e.target.value)}
                          placeholder="Postal code"
                          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-rose-300"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Country</span>
                        <input
                          value={guestAddress.country}
                          onChange={(e) => updateGuestAddress("country", e.target.value)}
                          placeholder="Country"
                          className={`w-full rounded-2xl border px-4 py-3 text-zinc-900 outline-none transition ${guestAddressErrors.country ? "border-red-500" : "border-zinc-300 focus:border-rose-300"}`}
                        />
                        {guestAddressErrors.country && <p className="mt-1 text-sm text-red-500">{guestAddressErrors.country}</p>}
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {loadingAddresses && <p className="mt-5 text-sm text-zinc-500">Loading addresses...</p>}

                  {!loadingAddresses && addresses.length === 0 && (
                    <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                      No saved addresses found. Add one before placing your order.
                    </div>
                  )}

                  {!loadingAddresses && addresses.length > 0 && (
                    <div className="mt-5 grid gap-3">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`cursor-pointer rounded-[28px] border p-4 transition ${
                            selectedAddressId === addr.id
                              ? "border-rose-300 bg-gradient-to-br from-white to-rose-50 shadow-sm"
                              : "border-zinc-200 bg-white hover:border-rose-200"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="selectedAddress"
                              checked={selectedAddressId === addr.id}
                              onChange={() => setSelectedAddressId(addr.id)}
                              className="mt-1 h-4 w-4 accent-rose-500"
                            />
                            <div className="text-sm text-zinc-600">
                              <p className="font-semibold text-zinc-950">
                                {addr.label ?? "Address"}
                                {isDefaultAddress(addr.is_default) && (
                                  <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-600">
                                    Default
                                  </span>
                                )}
                              </p>
                              <p className="mt-1">{addr.full_name}</p>
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
                </>
              )}
            </section>

            <section className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)]">
                  <CreditCard className="h-6 w-6" strokeWidth={2.1} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">Payment</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">How would you like to pay?</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => update("paymentMethod", "demo-card")}
                  className={`rounded-[28px] border p-4 text-left transition ${
                    form.paymentMethod === "demo-card"
                      ? "border-rose-300 bg-gradient-to-br from-white to-rose-50 shadow-sm"
                      : "border-zinc-200 bg-white hover:border-rose-200"
                  }`}
                >
                  <p className="text-lg font-black text-zinc-950">Card</p>
                  <p className="mt-1 text-sm text-zinc-600">Pay now with the demo card form.</p>
                </button>
                <button
                  type="button"
                  onClick={() => update("paymentMethod", "cash-on-delivery")}
                  className={`rounded-[28px] border p-4 text-left transition ${
                    form.paymentMethod === "cash-on-delivery"
                      ? "border-rose-300 bg-gradient-to-br from-white to-rose-50 shadow-sm"
                      : "border-zinc-200 bg-white hover:border-rose-200"
                  }`}
                >
                  <p className="text-lg font-black text-zinc-950">Cash on delivery</p>
                  <p className="mt-1 text-sm text-zinc-600">Pay when your order arrives.</p>
                </button>
              </div>

              {form.paymentMethod === "demo-card" && (
                <div className="mt-5 grid gap-4 rounded-[28px] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Card Number</span>
                    <input
                      inputMode="numeric"
                      autoComplete="cc-number"
                      className={`w-full rounded-2xl border px-4 py-3 text-zinc-900 outline-none transition ${fieldErrors.cardNumber ? "border-red-500" : "border-zinc-300 focus:border-rose-300"}`}
                      value={form.cardNumber}
                      onChange={(e) => update("cardNumber", formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                    />
                    {fieldErrors.cardNumber && <p className="mt-1 text-sm text-red-500">{fieldErrors.cardNumber}</p>}
                  </label>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Expiry</span>
                      <input
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        className={`w-full rounded-2xl border px-4 py-3 text-zinc-900 outline-none transition ${fieldErrors.expiry ? "border-red-500" : "border-zinc-300 focus:border-rose-300"}`}
                        value={form.expiry}
                        onChange={(e) => update("expiry", formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                      />
                      {fieldErrors.expiry && <p className="mt-1 text-sm text-red-500">{fieldErrors.expiry}</p>}
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">CVC</span>
                      <input
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        className={`w-full rounded-2xl border px-4 py-3 text-zinc-900 outline-none transition ${fieldErrors.cvc ? "border-red-500" : "border-zinc-300 focus:border-rose-300"}`}
                        value={form.cvc}
                        onChange={(e) => update("cvc", formatCvc(e.target.value))}
                        placeholder="123"
                      />
                      {fieldErrors.cvc && <p className="mt-1 text-sm text-red-500">{fieldErrors.cvc}</p>}
                    </label>
                  </div>
                </div>
              )}

              {error && <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {success && (
                <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                  {isGuest && placedOrderId && (
                    <>
                      {" "}
                      <Link href={`/track?orderId=${placedOrderId}`} className="font-semibold underline">
                        Track this order
                      </Link>
                      .
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  processing ||
                  cartItems.length === 0 ||
                  loadingAddresses ||
                  (!isGuest && !selectedAddressId) ||
                  !!success
                }
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {payButtonLabel}
              </button>
            </section>
          </form>

          <aside className="xl:sticky xl:top-8">
            <section className="rounded-[32px] border border-zinc-950/10 bg-zinc-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_16px_34px_rgba(244,63,94,0.28)]">
                  <Receipt className="h-6 w-6" strokeWidth={2.1} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-300">Summary</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">{itemCount} item{itemCount === 1 ? "" : "s"}</h2>
                </div>
              </div>

              {cartItems.length === 0 ? (
                <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  Your cart is empty.
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
                    {cartItems.map((item) => (
                      <div key={item.id + (item.boxID ?? "")} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-zinc-300">
                          {item.name} x {item.quantity}
                        </span>
                        <span className="font-semibold text-white">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3 text-zinc-300">
                      <span>Subtotal</span>
                      <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-zinc-300">
                      <span>Shipping</span>
                      <span className="font-semibold text-white">{shipping === 0 ? "Free" : formatCurrency(shipping)}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">Total</span>
                      <span className="text-3xl font-black tracking-tight text-white">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </>
              )}

              <p className="mt-4 text-sm leading-6 text-zinc-300">
                Orders are saved after payment or when cash on delivery is selected.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/checkout"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Back to Checkout
                </Link>
                {success && (
                  <Link
                    href="/buy"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400"
                  >
                    Start New Order
                  </Link>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
