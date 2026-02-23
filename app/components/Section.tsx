import { StaticImageData } from 'next/image'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useMediaQuery } from '@react-hook/media-query'

type propTypes = {
  imageSrc: StaticImageData,
  children: React.ReactNode,
  title?: string,
  mrgn?: number,
  height: number
}

export default function Section({imageSrc, children, title, mrgn, height}:propTypes) {


  return (
    <div style={{
      height: `${height}vh`, overflow:"clip",
      display: "flex", width: "100%", 
      // borderBottom: "2px solid #dea66f", borderTop: "2px solid #dea66f",
      
    }} className={` flex-col shadoweded rounded-lg`}
    >
      {/* {title && 
        <div style={{ minHeight: 0, flex: '1 1 0px', border:"2px solid #dea66f" }} 
          className="flex flex-col items-center justify-center bg-white" 
        >
          <h1 className="text-center" style={{ fontSize: "1.5vw" }}>{title}</h1>
        </div>
      } */}
      <div className="flex xs:flex-row flex-col-reverse" style={{ minHeight: 0, flex: '4 1 0px' ,
        // backgroundImage: `
        // linear-gradient(to right, rgba(255,255,255,0) 35%, rgba(255,255,255,1) 40%),
        // url(${imageSrc.src})`,
        // backgroundSize: 'cover',
        // backgroundRepeat: 'no-repeat',
        // backgroundPosition: 'center',
        width:"100%",
        justifyContent:"end",
      }}>
        {/* <div
          style={{ flex: '1 1 0px' }}
          className="xs:rounded-xl"
        >
          <Image src={imageSrc} alt="freshly baked" width={undefined} quality={100}
            className="object-cover h-full"
          />
        </div> */}
        
        <div style={{ width:"100%" }} className="flex flex-col items-center justify-center overflow-clip">
          {children}
        </div>
      </div>

    </div>
  )
}

// border-[#dea66f] border-b-8