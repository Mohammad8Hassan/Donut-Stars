'use client'

import { CircleMinus, CirclePlus } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useAppSelector } from '../store/hooks'
import { IBoxItem } from '@/types'

// type WithId = { id: string };

type QuantitySelectorType = {
  item: IBoxItem,
  handleBoxSelected: (boxItem: IBoxItem) => void
  handleBoxRemoved: (boxItem: IBoxItem) => void
}

export default function QuantitySelectorBox({ item, handleBoxSelected, handleBoxRemoved } : QuantitySelectorType) {

  const cart = useAppSelector(state => state.cart.items)

  // Keep the control in "in cart" mode if any box with this menu id exists.
  const [inCart, setInCart] = useState(cart.some(x => x.id == item.id));

  // Show total quantity across all box instances of this same menu item id.
  const getQuantity = (id: string) => {
    return cart.reduce((sum, cartItem) => {
      return cartItem.id == id ? sum + cartItem.quantity : sum
    }, 0)
  }

  let count = getQuantity(item.id)


  useEffect(() => {
    // Re-sync button state when the cart changes.
    const existsInCart = cart.some(x => x.id == item.id)
    console.log("[QuantitySelectorBox] cart sync", { id: item.id, inCart: existsInCart, count });
    setInCart(existsInCart)
  }, [cart])

  // Route both Add and + to the shared box modal flow handled in buy.tsx.
  const handleSelect = (item: IBoxItem) => {
    console.log("[QuantitySelectorBox] add flow", item)
    handleBoxSelected(item)
  }
  
  const isDecrementDisabled = count <= 1

  return (
    <div className="flex rounded-md transition-all duration-500 ease-out" style={{width: inCart ? "50%" : "100%"}}>
      {inCart ? (
        <>
          <button className={`flex items-center justify-center rounded-tl-xl rounded-bl-xl`
            }
            style={{
              border: "1px solid black",
              flex: 1
            }}
            onClick={() => handleBoxRemoved(item)}
            // disabled={isDecrementDisabled}
          >
            <CircleMinus strokeWidth={1} />
          </button>

          <div className="flex items-center justify-center" style={{
            flex: 1, borderTop: "1px solid black", borderBottom: "1px solid black"
          }}>
            {count}
          </div>

          <button className="flex items-center justify-center rounded-tr-xl rounded-br-xl" style={{
            border: "1px solid black",
            flex: 1
          }}
            onClick={() => handleSelect(item)}
          >
            <CirclePlus strokeWidth={1} />
          </button>
        </>
      ) : (
        <button className = "flex items-center justify-center rounded-xl" style = {{
          border: "1px solid black",
          flex: 1
        }}
          onClick={() => handleSelect(item)}
        >
          <text >Add to cart</text>
        </button >
      )}
    </div>
  )
}
