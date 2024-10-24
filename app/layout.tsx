import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navbar from './components/Navbar'
import Image from "next/image";
import logoBanner from '../public/logobanner3.png';


// const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DONUT STARS',
  description: 'Donut stars webite',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="">
      <body>
        {/* Header */}
        {/* <div className="h-1/3 border-[#dea66f] border-b-8 z-50">
          <Image src={logoBanner} alt="logoBanner" width={undefined} quality={100}
            className="h-full object-cover" 
          />
        </div> */}

        {/* Navbar */}
        <Navbar />

        <div className='h-full ' style={{}}>
          {children}
        </div>
        
      </body>
    </html>
  )
}

//bg-[url("./banner4.jpg")]
