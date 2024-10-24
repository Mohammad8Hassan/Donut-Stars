'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Kotta_One, Kreon } from 'next/font/google'
import Image from "next/image";
import logo from "@/public/logo.png";
import navItems from './navItems'

const kotta = Kotta_One({ weight:'400', subsets: ['latin'] });
const kreon = Kreon({ weight:'500', subsets: ['latin'] });

export default function Navbar() {
  
  return(
    <div style={{width:"100%", height:"15%", borderBottom:"2px solid #dea66f", position:"sticky", top:"0px",
      backgroundColor:"white", display:"flex", flexDirection:"row", justifyContent:"space-between",
      alignItems:"center", zIndex: 1000
    }} className='px-8'
    >
      <div style={{ display: "flex", flexDirection: "row", gap:"20px"}}>
        {
          navItems.map(item => (
            <Link href={item.url}>
              <div style={{ border: "1px solid #dea66f", borderRadius:8 

                }} 
                className='px-6 py-2 hover:bg-[#fff5eb] transition-all duration-300'
              >
                <p style={{fontSize:20}}>{item.name}</p>
              </div>
            </Link>
          ))
        }
      </div>

      <Image src={logo} alt="logoBanner" width={undefined} quality={100}
        className="h-full object-cover w-auto"
      />

      <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
        {
          navItems.map(item => (
            <Link href={item.url}>
              <div style={{
                border: "1px solid #dea66f", borderRadius: 8

              }}
                className='px-6 py-2 hover:bg-[#fff5eb] transition-all duration-300'
              >
                <p style={{ fontSize: 20 }}>{item.name}</p>
              </div>
            </Link>
          ))
        }
      </div>


    </div>
  )
}