import React from 'react'
import Image from 'next/image'
import { IItem } from '@/types'

type MenuItemProps = {
  item: IItem
  children?: React.ReactNode
}

export default function MenuItem({ item, children }: MenuItemProps) {
  const badgeStyles: Record<string, string> = {
    fruit: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    bestseller: 'border-amber-300 bg-amber-100 text-amber-800',
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-zinc-300 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.10)] ring-1 ring-white/90 transition duration-300 hover:-translate-y-1.5 hover:border-rose-300 hover:shadow-[0_26px_48px_rgba(244,63,94,0.14)]">
      <div className="relative overflow-hidden rounded-[26px] border border-zinc-200 bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.14),transparent_58%),linear-gradient(180deg,#fff8f4_0%,#fff1ea_100%)] px-4 py-5">
        <div className="absolute inset-x-6 top-4 h-20 rounded-full bg-[radial-gradient(circle,rgba(251,113,133,0.18),transparent_72%)] opacity-0 transition duration-300 group-hover:opacity-100" />

        {item.tags && item.tags.length > 0 && (
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
            {item.tags.map(tag => (
              <span
                key={tag}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  badgeStyles[tag] ?? 'border-zinc-200 bg-white text-zinc-600'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="relative mx-auto mt-6 h-40 w-full max-w-[220px] sm:h-44">
          <Image
            src={`/${item.image}`}
            alt={item.name}
            width={1000}
            height={1000}
            quality={100}
            className="h-full w-full object-contain drop-shadow-[0_20px_22px_rgba(15,23,42,0.10)] transition duration-500 group-hover:scale-[1.08] group-hover:-rotate-2"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-lg font-black tracking-tight text-zinc-950">
            {item.name}
          </h3>
          <p className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-600">
            {item.price}
          </p>
        </div>

        {item.discription && (
          <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-700">
            {item.discription}
          </p>
        )}

        <div className="mt-4 rounded-[22px] border border-zinc-200 bg-zinc-50 p-1.5 shadow-inner">
          {children}
        </div>
      </div>
    </article>
  )
}
