'use client'

import { CircleMinus, CirclePlus } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { IItem } from '@/types'
import { addItem, setQuantity } from '../store/cartSlice'

type QuantitySelectorType = {
  item: IItem
}

export default function QuantitySelector({ item }: QuantitySelectorType) {
  const dispatch = useAppDispatch()
  const cart = useAppSelector(state => state.cart.items)

  const [inCart, setInCart] = useState(cart.some(x => x.id == item.id))

  const handleSet = (item: IItem, quantity: number) => {
    // console.log('[QuantitySelector] setQuantity click', { id: item.id, name: item.name, nextQuantity: quantity })
    dispatch(
      setQuantity({
        id: item.id,
        quantity,
      })
    )
  }

  const getQuantity = (id: string) => {
    const cartItem = cart.find(existingItem => existingItem.id == id)
    return cartItem?.quantity || 0
  }

  const count = getQuantity(item.id)

  useEffect(() => {
    const existsInCart = cart.some(x => x.id == item.id)
    // console.log('[QuantitySelector] cart sync', { id: item.id, inCart: existsInCart, quantity: count })
    setInCart(existsInCart)
  }, [cart, item.id, count])

  const handleSelect = (item: IItem) => {
    // console.log('[QuantitySelector] addItem click', item)
    dispatch(
      addItem({
        id: item.id,
        name: item.name,
        discription: item.discription,
        price: item.price,
        image: item.image,
        quantity: 1,
      })
    )
  }

  return (
    <div className="flex min-h-[2rem] w-full overflow-hidden rounded-[18px] bg-zinc-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out">
      {inCart ? (
        <>
          <button
            className="flex flex-1 items-center justify-center transition hover:bg-white/10"
            onClick={() => handleSet(item, count - 1)}
            aria-label={`Decrease ${item.name} quantity`}
          >
            <CircleMinus className="h-4 w-4" strokeWidth={1.8} />
          </button>

          <div className="flex min-w-[72px] items-center justify-center border-x border-white/10 px-3 text-sm font-semibold">
            {count}
          </div>

          <button
            className="flex flex-1 items-center justify-center transition hover:bg-rose-500"
            onClick={() => handleSet(item, count + 1)}
            aria-label={`Increase ${item.name} quantity`}
          >
            <CirclePlus className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </>
      ) : (
        <button
          className="flex w-full items-center justify-center rounded-[18px] bg-zinc-950 px-4 text-sm font-semibold transition hover:bg-rose-500"
          onClick={() => handleSelect(item)}
        >
          Add to cart
        </button>
      )}
    </div>
  )
}
