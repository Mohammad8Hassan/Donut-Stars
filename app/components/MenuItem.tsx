import React, { PropsWithChildren } from 'react'
import Image from "next/image";
import { IItem } from '@/types';

type MenuItemProps = {
  item: IItem;
  children?: React.ReactNode;
};

export default function MenuItem({item, children}: MenuItemProps) {
  return (
    <div key={item.id} 
      className="flex flex-col hover:shadow-xl xs:rounded-xl border-[1px] border-zinc-300 transition-all duration-300
        h-full p-1
      "
    >
      <Image src={`/${item.image}`} alt="chocolate" width={1000} height={1000} quality={100}
        className="object-contain rounded-lg h-2/3" 
        style={{border:"1px solid lightgrey", width:"100%"}}
      />

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
