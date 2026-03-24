"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import donutList from "@/donut-list";
import { CircleMinus, CirclePlus, Edit, Torus, Trash, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addItem, removeBoxItem, setQuantity, updateItemByBoxID } from "../store/cartSlice";
import Image from "next/image";
import IconButton from "./IconButton";
import { IBoxItem, ICartItem, IItem } from "@/types";

interface DonutBoxModalProps {
  boxItem: ICartItem;
  isOpen: boolean;
  onClose: () => void;
  mode: "build" | "remove" | "edit";
  setBuilderMode: Dispatch<SetStateAction<"build" | "remove" | "edit">>;
  setSelectedBox: Dispatch<SetStateAction<ICartItem | undefined>>;
}

export default function BoxBuilder({ isOpen, onClose, boxItem, mode, setBuilderMode, setSelectedBox }: DonutBoxModalProps) {
  // Build mode preloads an empty capacity grid; edit mode loads the selected row's contents.
  const [selected, setSelected] = useState<(IItem | null)[]>(() =>
    mode == "edit" && boxItem.contents && boxItem.contents.length > 0
      ? boxItem.contents
      : Array(boxItem.size).fill(null)
  );

  const cart = useAppSelector(state => state.cart.items);
  const dispatch = useAppDispatch();

  // Modal remove-mode lists every existing row for this box id.
  const existingBoxes = cart.filter(item => item.id == boxItem.id);
  const labelSize = `${boxItem.size ?? 3}`;

  useEffect(() => {
    // Re-initialize the selected donuts whenever the opened box changes.
    setSelected(
      mode == "edit" && boxItem.contents && boxItem.contents.length > 0
        ? boxItem.contents
        : Array(boxItem.size || 3).fill(null)
    );
  }, [boxItem, mode]);

  // Add a donut into the first available slot.
  const handleSelect = (donut: IItem) => {
    const firstEmptyIndex = selected.findIndex((s) => s === null);
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

  // Remove one donut slot from the working draft.
  const handleRemove = (index: number) => {
    const updated = [...selected];
    const removed = updated[index];
    updated[index] = null;
    setSelected(updated);
    console.log("[BoxBuilder] removed donut slot", { boxId: boxItem.id, index, removedDonut: removed?.id });
  };

  // Build mode adds a new box instance; edit mode updates the selected instance only.
  const handleConfirm = () => {
    if (mode == "edit") {
      console.log("[BoxBuilder] updating existing box contents", { boxID: boxItem.boxID, boxId: boxItem.id });
      dispatch(updateItemByBoxID({
        boxID: boxItem.boxID!,
        updated: {
          contents: selected as IItem[],
        }
      }));
    } else {
      const payload = {
        id: boxItem.id,
        name: boxItem.name,
        discription: boxItem.discription,
        price: boxItem.price,
        image: boxItem.image,
        quantity: 1,
        contents: selected as IItem[],
        boxID: boxItem.boxID
      };

      console.log("[BoxBuilder] add box item to cart", payload);
      dispatch(addItem(payload));
    }
  };

  const handleAddToCart = () => {
    // Prevent incomplete box submissions.
    if (selected.length === boxItem.size) {
      handleConfirm();
      onClose();
      setSelected([]);
      console.log("[BoxBuilder] box confirmed and modal closed", { boxId: boxItem.id });
    } else {
      console.log("[BoxBuilder] not enough donuts selected", { boxId: boxItem.id, selected: selected.length, required: boxItem.size });
      alert(`Please select ${boxItem.size} donuts.`);
    }
  };

  // Increment a specific existing box instance by id+boxID.
  const handleIncreaseQuantity = (item: ICartItem) => {
    if (!item.boxID) return;
    const nextQuantity = item.quantity + 1;
    console.log("[BoxBuilder] increment existing box quantity", { boxID: item.boxID, nextQuantity });
    dispatch(setQuantity({
      id: item.id,
      boxID: item.boxID,
      quantity: nextQuantity,
    }));
  };

  // Decrement a specific existing box instance by id+boxID, keeping minimum at 1.
  const handleDecreaseQuantity = (item: ICartItem) => {
    if (!item.boxID || item.quantity <= 1) return;
    const nextQuantity = item.quantity - 1;
    console.log("[BoxBuilder] decrement existing box quantity", { boxID: item.boxID, nextQuantity });
    dispatch(setQuantity({
      id: item.id,
      boxID: item.boxID,
      quantity: nextQuantity,
    }));
  };

  // Build a fresh box instance to allow adding a new row (with different contents if user picks).
  const handleStartNewBox = () => {
    setSelectedBox({ ...boxItem, quantity: 1, boxID: crypto.randomUUID(), size: boxItem.size || 3 });
    setBuilderMode('build');
    console.log("[BoxBuilder] start new build flow", { boxId: boxItem.id });
  };

  useEffect(() => {
    console.log("[BoxBuilder] cart: ", cart);
    console.log("[BoxBuilder] boxItem: ", boxItem);
    console.log("[BoxBuilder] selected: ", selected);
  }, [mode, boxItem]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Open the existing row in edit mode from modal list.
  const handleEdit = (item: ICartItem) => {
    setSelectedBox({ ...item, discription: "menuItem", image: item.image, size: boxItem.size || 3 });
    setBuilderMode('edit');
  };

  // Remove by unique row id.
  const handleDelete = (item: ICartItem) => {
    if (!item.boxID) return;
    console.log("[BoxBuilder] remove box from cart", { boxId: item.id, boxID: item.boxID });
    dispatch(removeBoxItem({ boxID: item.boxID }));
  };

  if (!isOpen) return null;

  if (mode == "build" || mode == "edit") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
        onClick={handleBackdropClick}
      >
        <div className="relative bg-white rounded-2xl shadow-lg w-[800px] max-w-[90%] flex flex-col p-6">

          {/* Close button */}
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-black">
            <X size={20} />
          </button>

          <div className="flex gap-6 flex-1">
            <div className="flex-1 border rounded-lg p-4 grid grid-cols-3 gap-2">
              {selected.map((slot, i) => (
                <div
                  key={i}
                  className="h-20 w-full border flex items-center justify-center rounded-lg bg-gray-50 relative"
                >
                  {slot ? (
                    <>
                      <img src={slot.image} alt={slot.name} className="h-12 w-12 object-contain" />
                      <button
                        onClick={() => handleRemove(i)}
                        className="absolute top-1 right-1 text-xs bg-red-500 text-white px-1 rounded"
                      >
                        x
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400"><Torus /></span>
                  )}
                </div>
              ))}
            </div>

            <div className="w-1/3 border rounded-lg p-2 overflow-y-auto max-h-[400px]">
              {donutList.map((donut) => (
                <div
                  key={donut.id}
                  onClick={() => handleSelect(donut)}
                  className="flex items-center gap-3 p-2 border-b hover:bg-gray-100 cursor-pointer"
                >
                  <img src={donut.image} alt={donut.name} className="h-10 w-10 object-contain" />
                  <span>{donut.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer action buttons */}
          <div className="mt-6 flex justify-end gap-4">
            <button onClick={() => { setSelected([]); onClose(); }} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleAddToCart}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
            >
              {mode == "build" ? "Add to Cart" : "Update"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode == "remove") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
        onClick={handleBackdropClick}
      >
        <div className="relative bg-white rounded-2xl shadow-lg h-[75%] w-[90%] flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold">{boxItem.name}</p>
            {existingBoxes.length > 0 && (
              <button
                onClick={handleStartNewBox}
                className="px-3 py-2 border rounded-lg"
              >
                Add New {labelSize}-Capacity Box
              </button>
            )}
          </div>

          <div className="h-full w-full flex flex-col gap-2">
            {existingBoxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 h-full text-sm text-gray-500">
                <span>No boxes yet. Add the first {labelSize}-capacity box to begin.</span>
                <button onClick={handleStartNewBox} className="px-4 py-2 border rounded-lg">
                  Add a New {labelSize}-Capacity Box
                </button>
              </div>
            ) : existingBoxes.map(item => (
              <div
                key={item.boxID ?? item.id}
                className="w-full flex flex-row items-center justify-start p-2 gap-2 h-[30%]"
                style={{ border: "1px solid black" }}
              >
                <div className="h-full w-[20%] flex flex-col items-center justify-center rounded-xl"
                  style={{ border: "1px solid grey" }}
                >
                  <Image src={`/${item.image}`} alt="box" width={1000} height={1000} quality={100}
                    className="object-contain rounded-lg h-2/3 flex-1"
                  />
                  <span className="text-center">Qty: {item.quantity}</span>
                </div>

                <div className="flex flex-col w-[80%] h-full p-1 items-start justify-between">
                  <div className="flex flex-row h-full justify-center items-start gap-2">
                    {item.contents?.map(cont => (
                      <div key={cont.id} className="bg-[lightgrey] rounded-xl p-1 flex justify-center items-center">
                        <span className="text-center">{cont.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end w-full items-center gap-2">
                    <IconButton text="Add More" icon={<CirclePlus />} onClick={() => handleIncreaseQuantity(item)} />
                    <IconButton
                      text="Reduce"
                      icon={<CircleMinus />}
                      onClick={() => handleDecreaseQuantity(item)}
                      disabled={item.quantity <= 1}
                      className={item.quantity <= 1 ? "opacity-50 cursor-not-allowed" : ""}
                    />
                    <IconButton text="Edit Selection" icon={<Edit />} onClick={() => handleEdit(item)} />
                    <IconButton text="Remove" icon={<Trash />} onClick={() => handleDelete(item)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null;
}
