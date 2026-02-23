'use client'

import { CircleMinus, CirclePlus } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { IItem } from '@/donut-list'
import { addItem, setQuantity } from '../store/cartSlice'

// type WithId = { id: string };

type QuantitySelectorType = {
  item: IItem,
}

export default function QuantitySelector({item} : QuantitySelectorType) {

  const dispatch = useAppDispatch()
  const cart = useAppSelector(state => state.cart.items)

  const [inCart, setInCart] = useState(cart.some(x => x.id == item.id));

  const handleSet = (item: IItem, quantity:number) => {
    dispatch(setQuantity({
      id: item.id, 
      quantity: quantity
    }))
  }

  const getQuantity = (id: string) => {
    const item = cart.find(item => item.id == id)

    return item?.quantity || 0
  }

  let count = getQuantity(item.id)


  useEffect(() => {
    setInCart(cart.some(x => x.id == item.id))
  }, [cart])

  const handleSelect = (item: IItem) => {
    dispatch(addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1
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
            onClick={() => handleSet(item, count - 1)}
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
            onClick={() => handleSet(item, count + 1)}
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
