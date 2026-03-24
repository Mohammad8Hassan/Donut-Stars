import React from 'react'
import Image from "next/image";
import { IItem } from '@/types';

type MenuItemProps = {
  item: IItem;
  children?: React.ReactNode;
};

export default function MenuItem({item, children}: MenuItemProps) {
  const badgeStyles: Record<string, string> = {
    fruit: "bg-emerald-500 text-white border-emerald-600",
    bestseller: "bg-amber-300 text-zinc-900 border-amber-400",
  };

  return (
    <div key={item.id} 
      className="flex flex-col hover:shadow-xl xs:rounded-xl border-[1px] border-zinc-300 transition-all duration-300
        h-full p-1
      "
    >
      <div className="relative h-2/3">
        <Image src={`/${item.image}`} alt={item.name} width={1000} height={1000} quality={100}
          className="object-contain rounded-lg h-full"
          style={{border:"1px solid lightgrey", width:"100%"}}
        />

        {item.tags && item.tags.length > 0 && (
          <div id='tags' className="absolute left-2 top-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  badgeStyles[tag] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-around w-full px-1 flex-1 items-center">
        <text className="w-[80%]">{item.name}</text>
        <text className="">{item.price}</text>
      </div>

      <div style={{border:"1px solid lightgrey"}} 
        className="rounded-xl flex flex-row justify-end items-center"
      >
        {children} 
      </div>

    </div>
  )
}
