"use client"

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { clearCart, removeItem, setQuantity, selectCartItems, selectCartTotal } from "../store/cartSlice";
import Image from "next/image"
import { Minus, Plus, Trash2 } from "lucide-react"
import Link from "next/link";

export default function CheckoutPage() {
  const dispatch = useAppDispatch()
  const cartItems = useAppSelector(selectCartItems)
  const total = useAppSelector(selectCartTotal)

  const handleRemove = (id: string) => {
    dispatch(removeItem({ id }))
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    dispatch(setQuantity({ id, quantity }))
  }

  const handleClearCart = () => {
    if (confirm("Are you sure you want to clear the cart?")) {
      dispatch(clearCart())
    }
  }

  if (cartItems.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center gap-4">
        <h2 className="text-2xl font-semibold">Your cart is empty 🛒</h2>
        <p className="text-gray-500">Add some donuts and come back here to checkout!</p>
      </div>
    )

  return (
    <>
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-pink-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-pink-300 opacity-20 blur-3xl transform-gpu" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-purple-300 opacity-20 blur-3xl transform-gpu" />

        {/* subtle dot pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          aria-hidden
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
      <h1 className="text-3xl font-bold mb-4">Checkout</h1>

      {/* Cart items */}
      <div className="flex flex-col gap-4">
        {cartItems.map((item) => (
          <div
            key={item.id + (item.boxID ?? "")}
            className="flex flex-col md:flex-row items-start md:items-center justify-between border rounded-xl p-4 shadow-sm bg-white"
          >
            {/* Product image & info */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={`/${item.image}`}
                  alt={item.name}
                  fill
                  className="object-contain rounded-md"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-gray-600 text-sm">${item.price.toFixed(2)}</p>

                {/* Box contents */}
                {item.contents && item.contents.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.contents.map((d) => (
                      <span
                        key={d.id}
                        className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-lg"
                      >
                        {d.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity controls */}
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button
                onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                className="p-2 rounded-md border hover:bg-gray-100"
              >
                <Minus size={16} />
              </button>
              <span className="text-lg w-8 text-center">{item.quantity}</span>
              <button
                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                className="p-2 rounded-md border hover:bg-gray-100"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Subtotal + remove */}
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span className="font-medium text-lg">${(item.price * item.quantity).toFixed(2)}</span>
              <button
                onClick={() => handleRemove(item.id)}
                className="p-2 rounded-md border text-red-500 hover:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex flex-col items-end mt-6 border-t pt-6">
        <div className="text-xl font-semibold mb-4">Total: ${total.toFixed(2)}</div>
        <div className="flex gap-4">
          <button
            onClick={handleClearCart}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100"
          >
            Clear Cart
          </button>

          <Link href="/payment">
            <button
              className="px-6 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600"
            >
              Checkout
            </button>
          </Link>
        </div>
      </div>
    </div>
    </>
  )
}
