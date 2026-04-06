'use client'

import { CircleMinus, CirclePlus } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useAppSelector } from '../store/hooks'
import { IBoxItem } from '@/types'

type QuantitySelectorType = {
  item: IBoxItem
  handleBoxSelected: (boxItem: IBoxItem) => void
  handleBoxRemoved: (boxItem: IBoxItem) => void
}

export default function QuantitySelectorBox({ item, handleBoxSelected, handleBoxRemoved }: QuantitySelectorType) {
  const cart = useAppSelector(state => state.cart.items)
  const [inCart, setInCart] = useState(cart.some(x => x.id == item.id))

  const getQuantity = (id: string) => {
    return cart.reduce((sum, cartItem) => {
      return cartItem.id == id ? sum + cartItem.quantity : sum
    }, 0)
  }

  const count = getQuantity(item.id)

  useEffect(() => {
    const existsInCart = cart.some(x => x.id == item.id)
    console.log('[QuantitySelectorBox] cart sync', { id: item.id, inCart: existsInCart, count })
    setInCart(existsInCart)
  }, [cart, item.id, count])

  const handleSelect = (selectedItem: IBoxItem) => {
    console.log('[QuantitySelectorBox] add flow', selectedItem)
    handleBoxSelected(selectedItem)
  }

  return (
    <div className="flex min-h-[52px] w-full overflow-hidden rounded-[18px] bg-zinc-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out">
      {inCart ? (
        <>
          <button
            className="flex flex-1 items-center justify-center transition hover:bg-white/10"
            onClick={() => handleBoxRemoved(item)}
            aria-label={`Manage ${item.name} box quantity`}
          >
            <CircleMinus className="h-4 w-4" strokeWidth={1.8} />
          </button>

          <div className="flex min-w-[72px] items-center justify-center border-x border-white/10 px-3 text-sm font-semibold">
            {count}
          </div>

          <button
            className="flex flex-1 items-center justify-center transition hover:bg-rose-500"
            onClick={() => handleSelect(item)}
            aria-label={`Add or manage ${item.name}`}
          >
            <CirclePlus className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </>
      ) : (
        <button
          className="flex w-full items-center justify-center rounded-[18px] bg-zinc-950 px-4 text-sm font-semibold transition hover:bg-rose-500"
          onClick={() => handleSelect(item)}
        >
          Build this box
        </button>
      )}
    </div>
  )
}
