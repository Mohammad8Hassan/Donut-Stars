'use client'

import React from 'react'
import { useAppSelector } from '../store/hooks'
import { selectCartCount, selectCartTotal } from '../store/cartSlice'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const hideBarPaths = ["/checkout", "/login", "/register", "/payment", "checkout"]

export default function cartBar() {

  const cart = useAppSelector(state => state.cart.items)
  const total = useAppSelector(selectCartTotal)
  const totalNum = useAppSelector(selectCartCount)

  const pathname = usePathname()


  if (hideBarPaths.includes(pathname)) return
  
  return (
    <div style={{ border: "1px solid grey", width: "40%", height: "15%" }}
      className='fixed bottom-4 right-10 bg-white rounded-xl shadoweded
        flex flex-row items-center justify-center gap-4
      '
    >
      <text className=''
        style={{fontSize: "clamp(20px,20vw,40px)", color:"green"}}>
        {totalNum}x
      </text>

      <text className=''
        style={{ fontSize: "clamp(20px,20vw,40px)", color: "green" }}>
        <span style={{ color: "black" }}> Total: </span> ${total}
      </text>

      <div >
        <Link href="/checkout">
          <button>
            Checkout
          </button>
        </Link>
      </div>
    </div>
  )
}
