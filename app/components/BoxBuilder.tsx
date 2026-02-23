"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import donutList from "@/donut-list";
import { Delete, Edit, Torus, Trash, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addItem, removeBoxItem, removeStrays, updateItemByBoxID } from "../store/cartSlice";
import Image from "next/image";
import IconButton from "./IconButton";
import { IBoxItem, ICartItem, IItem } from "@/types";

interface DonutBoxModalProps {
  boxItem: ICartItem;
  isOpen: boolean;
  onClose: () => void;
  // boxSize: number;
  mode: "build" | "remove" | "edit";
  setBuilderMode: Dispatch<SetStateAction<"build" | "remove" | "edit">>;
  setSelectedBox: Dispatch<SetStateAction<ICartItem | undefined>>
}

export default function BoxBuilder({ isOpen, onClose, boxItem, mode, setBuilderMode, setSelectedBox }: DonutBoxModalProps) {
  const [selected, setSelected] = useState<(IItem | null)[]>(() =>
    mode == "edit" && boxItem.contents && boxItem.contents.length > 0
      ? boxItem.contents
      : Array(boxItem.size).fill(null)
  );

  const cart = useAppSelector(state => state.cart.items)
  const dispatch = useAppDispatch()

  useEffect(() => {
    console.log("changed: ", boxItem)
    // reinitialize whenever boxItem changes
    setSelected(
      mode == "edit" && boxItem.contents && boxItem.contents.length > 0
        ? boxItem.contents
        : Array(boxItem.size).fill(null)
    );
  }, [boxItem]);

  const handleSelect = (donut: IItem) => {
    const firstEmptyIndex = selected.findIndex((s) => s === null);
    if (firstEmptyIndex !== -1) {
      const updated = [...selected];
      updated[firstEmptyIndex] = donut;
      setSelected(updated);
    } else {
      alert(`All ${boxItem.size} slots are full.`);
    }
  };

  const handleRemove = (index: number) => {
    const updated = [...selected];
    updated[index] = null;
    setSelected(updated);
  };

  const handleConfirm = () => {
    if(mode == "edit") {
      dispatch(updateItemByBoxID({
        boxID: boxItem.boxID!,
        updated: {
          contents: selected as IItem[],
        }
      }))
    } else {
      dispatch(addItem({
        id: boxItem.id,
        name: boxItem.name,
        discription: boxItem.discription,
        price: boxItem.price,
        image: boxItem.image,
        quantity: 1,
        contents: selected as IItem[],
        boxID: boxItem.boxID
      }))
    }
  }

  const handleAddToCart = () => {
    if (selected.length === boxItem.size) {
      handleConfirm()
      onClose();
      setSelected([]);
    } else {
      alert(`Please select ${boxItem.size} donuts.`);
    }
  };

  useEffect(() => {
    console.log("cart: ", cart)
    console.log("boxItem: ", boxItem)
    console.log("selected: ", selected)

    // dispatch(removeStrays())
  }, [mode, boxItem])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleEdit = (item: ICartItem) => {
    setSelectedBox({...item, discription:"menuItem", image:item.image, size:boxItem.size || 3})
    setBuilderMode('edit')
  }

  const handleDelete = (item: ICartItem) => {
    if (!item.boxID) return;
    dispatch(removeBoxItem({boxID:item.boxID}))
  }

  if (!isOpen) return null;

  if(mode == "build" || mode == "edit")
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" 
        onClick={handleBackdropClick}
      >
        <div className="relative bg-white rounded-2xl shadow-lg w-[800px] max-w-[90%] flex flex-col p-6">

          {/* Close button */}
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-black">
            <X size={20} />
          </button>

          {/* Upper Area */}
          <div className="flex gap-6 flex-1">
            {/* Left: Selected Box */}
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

            {/* Right: Donut List */}
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

          {/* Bottom Area */}
          <div className="mt-6 flex justify-end gap-4">
            <button onClick={() => {setSelected([]); onClose()}} className="px-4 py-2 border rounded-lg">
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

  if(mode == "remove")
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
        onClick={handleBackdropClick}
      >
        <div className="relative bg-white rounded-2xl shadow-lg  h-[75%] w-[90%] flex flex-col p-6 overflow-y-auto">

          <div className="h-full w-full flex flex-col">
            {cart.map(item => {
              if (item.id == boxItem.id) {
                return (
                  <div className="w-full  flex flex-row items-center justify-start p-2 gap-2 h-[30%]" 
                    style={{ border: "1px solid black" }} 
                  >
                    <div className="h-full w-[20%] flex flex-col items-center justify-center rounded-xl"
                      style={{ border: "1px solid grey" }}
                    >
                      <Image src={`/${item.image}`} alt="chocolate" width={1000} height={1000} quality={100}
                        className="object-contain rounded-lg h-2/3 flex-1" 
                        
                      />
                      <span className="text-center">
                        {item.name}
                      </span>
                    </div>

                    {/* right stack */}
                    <div className="flex flex-col w-[80%] h-full p-1 items-start justify-between">
                      {/* contents */}
                      <div className="flex flex-row h-full justify-center items-start gap-2"
                      // style={{border:"1px solid black"}}
                      >
                        {item.contents?.map(cont => (
                          <div className="bg-[lightgrey] rounded-xl p-1 flex justify-center items-center">
                            <span className="text-center">
                              {cont.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* buttons */}
                      <div className="flex justify-end w-full items-center gap-2" >

                        <IconButton text="Edit Selection" icon={<Edit />} onClick={() => handleEdit(item)} />
                        <IconButton text="Remove" icon={<Trash />} onClick={() => handleDelete(item)} />
                        
                      </div>
                    </div>

                  </div>
                )
              }
            })}
          </div>
          
        </div>
      </div>
    )
}
