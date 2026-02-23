'use client'
import Link from 'next/link'
import { useState, useEffect, use } from 'react'
import { usePathname } from 'next/navigation'
import { Kotta_One, Kreon } from 'next/font/google'
import Image from "next/image";
import logo from "@/public/logo.png";
import navItems from './navItems'
import { MdAccountCircle as AccIcon } from "react-icons/md";
import { useScroll } from './ScrollProvider'
import { useAuth } from '../context/useAuth'


const kotta = Kotta_One({ weight:'400', subsets: ['latin'] });
const kreon = Kreon({ weight:'500', subsets: ['latin'] });


export default function Navbar() {

  const { scrolled } = useScroll()
  const { user, setUser } = useAuth();
  
  useEffect(() => {
    console.log("User in Navbar:", user);
    console.log("User in Navbar:", user?.name);
  }, [user]);

  const handleLogOut = async () => {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        setUser(null);
      } else {
        // Handle error
        console.error("Failed to log out");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return(
    <div id='navBar' style={{width:"100%", height:"10%", position:"sticky", top:"0px",
      backgroundColor: scrolled ? "rgba(255, 255, 255, 0.3)" : "white", display:"flex", 
      backdropFilter: scrolled ? "blur(8px)" : "none", 
      WebkitBackdropFilter: scrolled ? "blur(10px)" : "none",
      flexDirection:"row", justifyContent:"space-between",
      alignItems:"center", zIndex: 1000, boxShadow: scrolled ? "0px 0px 16px 0px rgb(0,0,0,0.3)" : "none",
      
    }} className='px-8  transition-all'
    >
      {/* nav buttons */}
      <div style={{ display: "flex", flexDirection: "row", gap:"20px"}}>
        {
          navItems.map(item => (
            <Link href={item.url}>
              <div style={{ borderRadius: 8, 
              }} 
                className='px-6 hover:bg-[#f4d9be] transition-all duration-300 relative'

                // onMouseEnter={e => (e.currentTarget.style.background = 'url(/svg/donut2.svg) no-repeat center/contain')}
                // onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {/* <div id="circle" className='h-full bg-[#edb985] rounded-2xl absolute m-auto z-0 aspect-square inset-0'>
                  <div></div>
                </div> */}
                
                <p className='relative' style={{fontSize:20, paddingBottom:2}}>{item.name}</p>


              </div>
            </Link>
          ))
        }
      </div>

      <Image src={logo} alt="logoBanner" width={undefined} quality={100}
        className="h-full object-cover w-auto rounded-full"
        style={{border:"1px solid black"}}
      />

      {user ? (
        <div style = {{
          display: "flex", flexDirection: "row", gap: "10px", border: "1px solid black",
          alignItems: "center", borderRadius: 10, overflow: "visible", width: "15%", justifyContent: "space-around"
        }}>
          <Link href={"/account"} style={{  }}>
            <div style={{
              border: "1px solid black", borderRadius: 8,
              textAlign: "center"
            }}
              className='px-2 py-1  transition-all duration-200'
            >
              <p style={{ fontSize: 12 }}>{user.email}</p>
            </div>
          </Link>

          <button>
            <div style={{
              border: "1px solid black", borderRadius: 8,
              textAlign: "center"
            }} onClick={handleLogOut}
              className='px-2 py-1  transition-all duration-200'
            >
              <p style={{ fontSize: 12 }}>Logout</p>
            </div>
          </button>
        </div>
      ):(
        <div style = {{
          display: "flex", flexDirection: "row", gap: "10px", border: "1px solid black",
          alignItems: "center", borderRadius: 10, overflow: "visible", width: "20%",
        }}
          className='p-1 bg-white'
          >
          <AccIcon size={30} color="black" style={{}} />

          <div style={{ display: "flex", flex: "1 1 1px", flexDirection: "row", gap: "5px" }}>

            <Link href={"/login"} style={{ flex: "1 1 0px" }}>
              <div style={{
                border: "1px solid black", borderRadius: 8,
                textAlign: "center"
              }}
                className='px-2 py-1 transition-all duration-200'
              >
                <p style={{ fontSize: 12 }}>Login</p>
              </div>
            </Link>

            <Link href={"/signup"} style={{ flex: "1 1 0px" }}>
              <div style={{
                border: "1px solid black", borderRadius: 8,
                textAlign: "center"
              }}
                className='px-2 py-1  transition-all duration-200'
              >
                <p style={{ fontSize: 12 }}>Sign Up</p>
              </div>
            </Link>

          </div>
        </div>
      )}
      


      {/* <div style={{ display: "flex", flexDirection: "column", gap: "5px", overflow: "visible" }}>
        
      </div> */}
      


    </div>
  )
}


//hover:bg-[#f4d9be]

//hover:bg-[url("/svg/donut1.svg")]