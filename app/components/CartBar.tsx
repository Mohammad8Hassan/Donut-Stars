'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { selectCartCount, selectCartTotal } from '../store/cartSlice'
import { useAppSelector } from '../store/hooks'

const hideBarPaths = ['/checkout', '/login', '/register', '/payment', 'checkout']

export default function CartBar() {
  const cart = useAppSelector(state => state.cart.items)
  const total = useAppSelector(selectCartTotal)
  const totalNum = useAppSelector(selectCartCount)
  const pathname = usePathname()
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(total)

  if (hideBarPaths.includes(pathname)) return null
  if (cart.length === 0) return null

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:right-6 sm:w-[min(420px,calc(100vw-3rem))]
        rounded-[28px] border border-rose-200/70 bg-gradient-to-br from-white via-rose-50 to-amber-50
        p-3 shadow-[0_20px_45px_rgba(15,23,42,0.16)] backdrop-blur"
    >
      <div className="flex items-center gap-3 rounded-[22px] bg-white/80 px-3 py-3 shadow-sm ring-1 ring-white/70">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_12px_24px_rgba(244,63,94,0.28)]">
          <ShoppingBag className="h-5 w-5" strokeWidth={2.1} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Ready to checkout
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-black leading-none text-zinc-900 sm:text-2xl">
                {formattedTotal}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {totalNum} item{totalNum === 1 ? '' : 's'} in your cart
              </p>
            </div>
          </div>
        </div>

        <Link href="/checkout">
          <button
            className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold
              text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500
              focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
          >
            Checkout
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </Link>
      </div>
    </div>
  )
}
