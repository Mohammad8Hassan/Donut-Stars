"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  CircleMinus,
  CirclePlus,
  Edit,
  PackageOpen,
  ShoppingBag,
  Torus,
  Trash,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addItem, removeBoxItem, setQuantity, updateItemByBoxID } from "../store/cartSlice";
import Image from "next/image";
import { ICartItem, IItem } from "@/types";

interface DonutBoxModalProps {
  boxItem: ICartItem;
  isOpen: boolean;
  onClose: () => void;
  mode: "build" | "remove" | "edit";
  setBuilderMode: Dispatch<SetStateAction<"build" | "remove" | "edit">>;
  setSelectedBox: Dispatch<SetStateAction<ICartItem | undefined>>;
  donuts: IItem[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export default function BoxBuilder({
  isOpen,
  onClose,
  boxItem,
  mode,
  setBuilderMode,
  setSelectedBox,
  donuts,
}: DonutBoxModalProps) {
  const capacity = boxItem.size || 3;
  const [selected, setSelected] = useState<(IItem | null)[]>(() =>
    mode == "edit" && boxItem.contents && boxItem.contents.length > 0
      ? boxItem.contents
      : Array(capacity).fill(null)
  );

  const cart = useAppSelector((state) => state.cart.items);
  const dispatch = useAppDispatch();

  const existingBoxes = cart.filter((item) => item.id == boxItem.id);
  const labelSize = `${capacity}`;
  const filledCount = selected.filter(Boolean).length;

  useEffect(() => {
    setSelected(
      mode == "edit" && boxItem.contents && boxItem.contents.length > 0
        ? boxItem.contents
        : Array(boxItem.size || 3).fill(null)
    );
  }, [boxItem, mode]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleSelect = (donut: IItem) => {
    const firstEmptyIndex = selected.findIndex((slot) => slot === null);
    if (firstEmptyIndex !== -1) {
      const updated = [...selected];
      updated[firstEmptyIndex] = donut;
      setSelected(updated);
      console.log("[BoxBuilder] selected donut for box", { boxId: boxItem.id, donutId: donut.id, slot: firstEmptyIndex });
    } else {
      console.log("[BoxBuilder] box full, cannot add more donuts", { boxId: boxItem.id, size: boxItem.size });
      alert(`All ${boxItem.size} slots are full.`);
    }
  };

  const handleRemove = (index: number) => {
    const updated = [...selected];
    const removed = updated[index];
    updated[index] = null;
    setSelected(updated);
    console.log("[BoxBuilder] removed donut slot", { boxId: boxItem.id, index, removedDonut: removed?.id });
  };

  const handleConfirm = () => {
    if (mode == "edit") {
      console.log("[BoxBuilder] updating existing box contents", { boxID: boxItem.boxID, boxId: boxItem.id });
      dispatch(
        updateItemByBoxID({
          boxID: boxItem.boxID!,
          updated: {
            contents: selected as IItem[],
          },
        })
      );
    } else {
      const payload = {
        id: boxItem.id,
        name: boxItem.name,
        discription: boxItem.discription,
        price: boxItem.price,
        image: boxItem.image,
        quantity: 1,
        contents: selected as IItem[],
        boxID: boxItem.boxID,
      };

      console.log("[BoxBuilder] add box item to cart", payload);
      dispatch(addItem(payload));
    }
  };

  const handleAddToCart = () => {
    if (filledCount === capacity) {
      handleConfirm();
      onClose();
      setSelected([]);
      console.log("[BoxBuilder] box confirmed and modal closed", { boxId: boxItem.id });
    } else {
      console.log("[BoxBuilder] not enough donuts selected", { boxId: boxItem.id, selected: filledCount, required: capacity });
      alert(`Please select ${capacity} donuts.`);
    }
  };

  const handleIncreaseQuantity = (item: ICartItem) => {
    if (!item.boxID) return;
    const nextQuantity = item.quantity + 1;
    console.log("[BoxBuilder] increment existing box quantity", { boxID: item.boxID, nextQuantity });
    dispatch(
      setQuantity({
        id: item.id,
        boxID: item.boxID,
        quantity: nextQuantity,
      })
    );
  };

  const handleDecreaseQuantity = (item: ICartItem) => {
    if (!item.boxID || item.quantity <= 1) return;
    const nextQuantity = item.quantity - 1;
    console.log("[BoxBuilder] decrement existing box quantity", { boxID: item.boxID, nextQuantity });
    dispatch(
      setQuantity({
        id: item.id,
        boxID: item.boxID,
        quantity: nextQuantity,
      })
    );
  };

  const handleStartNewBox = () => {
    setSelectedBox({ ...boxItem, quantity: 1, boxID: crypto.randomUUID(), size: capacity });
    setBuilderMode("build");
    console.log("[BoxBuilder] start new build flow", { boxId: boxItem.id });
  };

  useEffect(() => {
    console.log("[BoxBuilder] cart: ", cart);
    console.log("[BoxBuilder] boxItem: ", boxItem);
    console.log("[BoxBuilder] selected: ", selected);
  }, [mode, boxItem, cart, selected]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleEdit = (item: ICartItem) => {
    setSelectedBox({ ...item, discription: "menuItem", image: item.image, size: capacity });
    setBuilderMode("edit");
  };

  const handleDelete = (item: ICartItem) => {
    if (!item.boxID) return;
    console.log("[BoxBuilder] remove box from cart", { boxId: item.id, boxID: item.boxID });
    dispatch(removeBoxItem({ boxID: item.boxID }));
  };

  if (!isOpen) return null;

  if (mode == "build" || mode == "edit") {
    return (
      <div
        className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-zinc-950/60 p-3 sm:p-6 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)] sm:max-h-[calc(100vh-4rem)]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-500 transition hover:border-rose-200 hover:text-zinc-950"
          >
            <X size={18} />
          </button>

          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="flex min-h-0 flex-col border-b border-zinc-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 lg:border-b-0 lg:border-r">
              <div className="px-5 py-3 sm:px-6">
                <div className="flex items-center gap-3 pr-12">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_16px_34px_rgba(244,63,94,0.25)]">
                    <PackageOpen className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-500">
                      {mode === "build" ? "Build your box" : "Update your box"}
                    </p>
                    <h2 className="text-lg font-black leading-tight tracking-tight text-zinc-950 sm:text-xl">
                      {boxItem.name} — pick {capacity} donuts
                    </h2>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-sm">
                  <div className="border-b border-zinc-100 px-5 py-4">
                    <p className="text-sm font-semibold text-zinc-900">Your box layout</p>
                    <p className="text-sm text-zinc-500">Remove any donut by tapping the close button.</p>
                  </div>

                  <div className={`grid auto-rows-fr gap-3 p-4 ${capacity >= 12 ? "grid-cols-4" : "grid-cols-3"}`}>
                    {selected.map((slot, i) => (
                      <div
                        key={i}
                        className={`relative flex h-full min-h-[190px] flex-col overflow-hidden rounded-3xl border p-3 ${
                          slot
                            ? "border-rose-200 bg-gradient-to-br from-white to-rose-50 shadow-[0_12px_24px_rgba(244,63,94,0.08)]"
                            : "border-dashed border-zinc-200 bg-zinc-50"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 shadow-sm">
                            Slot {i + 1}
                          </span>
                          {slot && (
                            <button
                              onClick={() => handleRemove(i)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition hover:bg-rose-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col items-center justify-center text-center">
                          {slot ? (
                            <>
                              <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                                <Image src={`/${slot.image}`} alt={slot.name} fill className="object-contain" />
                              </div>
                              <p className="mt-3 line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-5 text-zinc-900">
                                {slot.name}
                              </p>
                            </>
                          ) : (
                            <Torus className="h-24 w-24 text-zinc-300 sm:h-28 sm:w-28" strokeWidth={1.1} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-col bg-zinc-950 text-white">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3 sm:px-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300">Choose donuts</p>
                <h3 className="text-lg font-black tracking-tight">Pick from the menu</h3>
              </div>

              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5 sm:py-5">
                {donuts.map((donut) => (
                  <button
                    key={donut.id}
                    onClick={() => handleSelect(donut)}
                    className="group flex min-h-[220px] flex-col items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-4 text-center transition hover:border-rose-300/40 hover:bg-white/10"
                  >
                    <div className="flex flex-1 items-center justify-center">
                      <div className="relative h-32 w-32 sm:h-36 sm:w-36">
                        <Image src={`/${donut.image}`} alt={donut.name} fill className="object-contain" />
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-[3rem] text-sm font-semibold leading-6 text-white">
                      {donut.name}
                    </p>
                    {/* <div className="mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white transition group-hover:scale-105 group-hover:bg-rose-400">
                      <CirclePlus className="h-4 w-4" />
                    </div> */}
                  </button>
                ))}
              </div>

              <div className="sticky bottom-0 border-t border-white/10 bg-zinc-950 px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    onClick={() => {
                      setSelected([]);
                      onClose();
                    }}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToCart}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400"
                  >
                    {mode == "build" ? "Add Box to Cart" : "Save Box Changes"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (mode == "remove") {
    return (
      <div
        className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-zinc-950/60 p-3 sm:p-6 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)] sm:max-h-[calc(100vh-4rem)]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-500 transition hover:border-rose-200 hover:text-zinc-950"
          >
            <X size={18} />
          </button>

          <div className="border-b border-zinc-100 bg-gradient-to-r from-rose-50 via-white to-amber-50 px-6 py-3 pr-16">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-500">Manage your boxes</p>
                <h2 className="text-lg font-black leading-tight tracking-tight text-zinc-950 sm:text-xl">{boxItem.name}</h2>
                <p className="hidden text-xs leading-4 text-zinc-600 sm:block">
                  Review, adjust, or remove any {labelSize}-donut box in your cart.
                </p>
              </div>

              {existingBoxes.length > 0 && (
                <button
                  onClick={handleStartNewBox}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
                >
                  <CirclePlus className="h-4 w-4" />
                  Add New {labelSize}-Box
                </button>
              )}
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-1.5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Box Type</p>
                <p className="text-base font-black text-zinc-950">{labelSize}-pack</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-1.5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">In Cart</p>
                <p className="text-base font-black text-zinc-950">{existingBoxes.length} variant{existingBoxes.length === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-1.5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Unit Price</p>
                <p className="text-base font-black text-zinc-950">{formatCurrency(boxItem.price)}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/70 p-6">
            {existingBoxes.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-zinc-300 bg-white px-6 text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">No boxes in cart yet</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-zinc-600">
                  Start your first {labelSize}-donut box and we&apos;ll list each custom combination here for quick editing.
                </p>
                <button
                  onClick={handleStartNewBox}
                  className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400"
                >
                  <CirclePlus className="h-4 w-4" />
                  Build a {labelSize}-Box
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {existingBoxes.map((item, index) => (
                  <div
                    key={item.boxID ?? item.id}
                    className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.06)]"
                  >
                    <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
                      <div className="flex flex-col justify-between border-b border-zinc-100 bg-gradient-to-br from-white to-rose-50 p-5 lg:border-b-0 lg:border-r">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">Box {index + 1}</p>
                          <p className="mt-2 text-xl font-black text-zinc-950">{boxItem.name}</p>
                          <p className="mt-1 text-sm text-zinc-600">Custom {labelSize}-donut assortment</p>
                        </div>

                        <div className="mt-5 flex items-center gap-4">
                          <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-white bg-white shadow-sm">
                            <Image src={`/${item.image}`} alt="box" fill className="object-contain p-3" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Quantity</p>
                            <p className="mt-1 text-3xl font-black leading-none text-zinc-950">{item.quantity}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="mb-4 flex flex-wrap gap-2">
                          {item.contents?.map((cont, contentIndex) => (
                            <div
                              key={`${cont.id}-${contentIndex}`}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-zinc-700"
                            >
                              {cont.name}
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
                            <button
                              onClick={() => handleDecreaseQuantity(item)}
                              disabled={item.quantity <= 1}
                              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <CircleMinus className="h-4 w-4" />
                            </button>
                            <span className="min-w-12 px-3 text-center text-sm font-semibold text-zinc-900">{item.quantity}</span>
                            <button
                              onClick={() => handleIncreaseQuantity(item)}
                              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-white"
                            >
                              <CirclePlus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 transition hover:border-rose-200 hover:bg-rose-50"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Selection
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              <Trash className="h-4 w-4" />
                              Remove Box
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
