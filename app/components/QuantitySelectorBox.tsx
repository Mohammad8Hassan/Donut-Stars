'use client'

import { CircleMinus, CirclePlus } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { addItem, setQuantity } from '../store/cartSlice'
import { IBoxItem, ICartItem } from '@/types'

// type WithId = { id: string };

type QuantitySelectorType = {
  item: IBoxItem,
  handleBoxSelected: (boxItem: IBoxItem) => void
  handleBoxRemoved: (boxItem: IBoxItem) => void
}

export default function QuantitySelectorBox({ item, handleBoxSelected, handleBoxRemoved } : QuantitySelectorType) {

  const dispatch = useAppDispatch()
  const cart = useAppSelector(state => state.cart.items)

  const [inCart, setInCart] = useState(cart.some(x => x.id == item.id));

  const handleSet = (item: IBoxItem, quantity:number) => {
    dispatch(setQuantity({
      id: item.id, 
      quantity: quantity
    }))
  }

  const getQuantity = (id: string) => {
    const item = cart.filter(item => item.id == id)

    return item?.length || 0
  }

  let count = getQuantity(item.id)


  useEffect(() => {
    setInCart(cart.some(x => x.id == item.id))
  }, [cart])

  const handleSelect = (item: IBoxItem) => {
    dispatch(addItem({
      id: item.id,
      name: item.name,
      discription:item.discription,
      price: item.price,
      image: item.image,
      quantity: 1,
      boxID: crypto.randomUUID()
    }))
  }
  
  return (
    <div className="flex rounded-md transition-all duration-500 ease-out" style={{width: inCart ? "50%" : "100%"}}>
      {inCart ? (
        <>
          <button className="flex items-center justify-center rounded-tl-xl rounded-bl-xl"
            style={{
              border: "1px solid black",
              flex: 1
            }}
            onClick={() => handleBoxRemoved(item)}
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
            onClick={() => handleBoxSelected(item)}
          >
            <CirclePlus strokeWidth={1} />
          </button>
        </>
      ) : (
        <button className = "flex items-center justify-center rounded-xl" style = {{
          border: "1px solid black",
          flex: 1
        }}
          onClick={() => handleBoxSelected(item)}
        >
          <text >Add to cart</text>
        </button >
      )}
    </div>
  )
}
