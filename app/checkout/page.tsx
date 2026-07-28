"use client"

import { ICartItem } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { clearCart, removeBoxItem, removeItem, selectCartItems, selectCartTotal, setQuantity } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const total = useAppSelector(selectCartTotal);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleRemove = (item: ICartItem) => {
    if (item.boxID) {
      dispatch(removeBoxItem({ boxID: item.boxID }));
      return;
    }

    dispatch(removeItem({ id: item.id }));
  };

  const handleQuantityChange = (item: ICartItem, quantity: number) => {
    if (item.boxID) {
      dispatch(setQuantity({ id: item.id, boxID: item.boxID, quantity }));
      return;
    }

    dispatch(setQuantity({ id: item.id, quantity }));
  };

  const handleClearCart = () => {
    if (confirm("Are you sure you want to clear your cart?")) {
      dispatch(clearCart());
    }
  };

  if (cartItems.length === 0) {
    return (
      <main className="relative isolate overflow-hidden">
        
        

        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center px-4 py-6 sm:px-6 lg:px-8">
          <section className="w-full rounded-[28px] border border-white/70 bg-white/85 p-6 text-center shadow-[0_28px_70px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_16px_32px_rgba(244,63,94,0.25)]">
              <ShoppingBag className="h-6 w-6" strokeWidth={2.1} />
            </div>
            <h1 className="mt-3 text-xl font-black leading-tight tracking-tight text-zinc-950">Your cart is empty</h1>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-zinc-600">
              Pick your favorites and come back when you&apos;re ready.
            </p>
            <Link
              href="/menu"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
            >
              Browse Menu
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate overflow-hidden">
      
      

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <section className="overflow-hidden rounded-[28px] border border-rose-100 bg-white/85 shadow-[0_28px_70px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-3 sm:px-5">
            <h1 className="text-lg font-black leading-tight tracking-tight text-zinc-950 sm:text-xl">Checkout</h1>
            <p className="mt-1 hidden text-xs leading-5 text-zinc-600 sm:block">
              Review your order and continue when you&apos;re ready.
            </p>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <section className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-100 px-2 pb-3">
              <h2 className="text-lg font-black leading-tight tracking-tight text-zinc-950">Your order</h2>
              <button
                onClick={handleClearCart}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:bg-rose-50"
              >
                Clear Cart
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {cartItems.map((item) => (
                <article
                  key={item.id + (item.boxID ?? "")}
                  className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-white to-rose-50/60 p-3 shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:p-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_140px] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
                        <Image
                          src={`/${item.image}`}
                          alt={item.name}
                          fill
                          className="object-contain p-2"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black leading-tight tracking-tight text-zinc-950">{item.name}</h3>
                        <p className="mt-1 text-sm font-medium text-zinc-500">{formatCurrency(item.price)}</p>

                        {item.contents && item.contents.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.contents.map((donut, index) => (
                              <span
                                key={`${donut.id}-${index}`}
                                className="rounded-full border border-rose-200 bg-white/90 px-2.5 py-1 text-xs font-semibold text-zinc-700"
                              >
                                {donut.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-2 lg:justify-self-center lg:w-[140px]">
                      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Quantity</p>
                      <div className="mt-1.5 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
                        <button
                          onClick={() => handleQuantityChange(item, Math.max(1, item.quantity - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={item.quantity <= 1}
                          aria-label={`Decrease quantity for ${item.name}`}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="min-w-[2.5rem] text-center text-base font-black text-zinc-950">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity + 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100"
                          aria-label={`Increase quantity for ${item.name}`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3 lg:flex-col lg:items-stretch lg:justify-self-end lg:w-[140px]">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Subtotal</p>
                        <p className="mt-1 text-lg font-black tracking-tight text-zinc-950">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemove(item)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 lg:w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="xl:sticky xl:top-4">
            <section className="rounded-[28px] border border-zinc-950/10 bg-zinc-950 p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_16px_34px_rgba(244,63,94,0.28)]">
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300">Summary</p>
                  <h2 className="mt-1 text-lg font-black leading-tight tracking-tight">{itemCount} item{itemCount === 1 ? "" : "s"}</h2>
                </div>
              </div>

              <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">Total</span>
                  <span className="text-2xl font-black tracking-tight text-white">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/payment"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400"
                >
                  Continue to Payment
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Add More Items
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
