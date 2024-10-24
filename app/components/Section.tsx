import { StaticImageData } from 'next/image'
import React from 'react'
import Image from 'next/image'

type propTypes = {
  imageSrc: StaticImageData,
  children: React.ReactNode,
  title?: string,
  mrgn?: number,
  height: number
}

export default function Section({imageSrc, children, title, mrgn, height}:propTypes) {
  return (
    <div style={{ height:`${height}vh`, overflow:"clip",
      display:"flex",
    }} className={` flex-col bg-[#fff5eb]`}
    >
      {title && 
        <div style={{ minHeight: 0, flex: '1 1 0px', border:"2px solid #dea66f" }} 
          className="flex flex-col items-center justify-center bg-white" 
        >
          <h1 className="text-center" style={{ fontSize: "1.5vw" }}>{title}</h1>
        </div>
      }
      <div className=" flex xs:flex-row flex-col-reverse" style={{ minHeight: 0, flex: '4 1 0px' }}>
        <div
          style={{ flex: '1 1 0px' }}
          className="xs:rounded-xl"
        >
          <Image src={imageSrc} alt="freshly baked" width={undefined} quality={100}
            className="object-cover h-full"
          />
        </div>
        
        <div style={{ flex: '1 1 0px' }} className="flex flex-col items-center justify-center overflow-clip">
          {children}
        </div>
      </div>

    </div>
  )
}

// border-[#dea66f] border-b-8