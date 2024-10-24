import { StaticImageData } from 'next/image'
import React from 'react'
import Image from 'next/image'

type propTypes = {
  imageSrc: StaticImageData,
  children: React.ReactNode,
  title?: string,
  mrgn?: number
}

export default function Section({imageSrc, children, title, mrgn}:propTypes) {
  return (
    <div style={{ marginTop: `${mrgn}px`}} className={` sm:max-h-[500px] `}>

      {title && <h1 className="mx-auto my-5 text-center">{title}</h1>}

      <div className=" bg-white flex xs:flex-row flex-col-reverse border-[#dea66f] border-b-8">
        <div
          style={{ flex: '1 1 0px' }}
          className="xs:rounded-xl flex-grow lg:min-h-[400px] max-h-[400px]"
        >
          <Image src={imageSrc} alt="freshly baked" width={undefined} quality={100}
            className=" h-full object-cover"
          />
        </div>
        
        <div style={{ flex: '1 1 0px' }} className="flex flex-col flex-grow items-center justify-center h-[150px] xs:h-auto">
          {children}
        </div>
      </div>

    </div>
  )
}
