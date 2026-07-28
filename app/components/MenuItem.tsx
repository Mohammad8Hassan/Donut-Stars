import React from 'react'
import Image from 'next/image'
import { IItem } from '@/types'

type MenuItemProps = {
  item: IItem
  kind?: 'donut' | 'drink' | 'box'
  children?: React.ReactNode
}

export default function MenuItem({ item, kind, children }: MenuItemProps) {
  const badgeStyles: Record<string, string> = {
    fruit: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    bestseller: 'border-amber-300 bg-amber-100 text-amber-800',
  }

  return (
    <article className="group flex w-full h-full flex-col rounded-[30px] border border-zinc-300 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.10)] ring-1 ring-white/90 transition duration-300 hover:border-rose-300 hover:shadow-[0_26px_48px_rgba(244,63,94,0.14)]">
      <div className="relative w-full overflow-hidden rounded-[26px] border border-zinc-200 bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.14),transparent_58%),linear-gradient(180deg,#fff8f4_0%,#fff1ea_100%)] ">
        <div className="absolute w-full h-full bg-[radial-gradient(ellipse,rgba(251,113,133,0.18)_0%,rgba(251,113,133,0.18)_55%,transparent_100%)] opacity-0 group-hover:animate-glow-pulse" />

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

        <div
          className={`relative mx-auto h-40 w-full sm:h-44 ${
            kind === 'drink' ? '' : 'max-w-[220px]'
          }`}
        >
          <Image
            src={`/${item.image}`}
            alt={item.name}
            width={1000}
            height={1000}
            quality={100}
            className={`h-full w-full drop-shadow-[0_20px_22px_rgba(15,23,42,0.10)] transition duration-500 group-hover:scale-[1.08] object-top
              ${
              kind === 'drink' ? 'object-cover' : 'object-contain'
            }`}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-lg font-black tracking-tight text-zinc-950">
            {item.name}
          </h3>
          <p className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-600">
            {item.price} $
          </p>
        </div>

        {item.discription && (
          <p className="mt-1 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-700">
            {item.discription}
          </p>
        )}

        <div className="mt-2 h-[30%] rounded-[22px] bg-zinc-50  shadow-inner">
          {children}
        </div>
      </div>
    </article>
  )
}
