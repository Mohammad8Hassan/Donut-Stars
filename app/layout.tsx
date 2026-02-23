import './globals.css'
import type { Metadata } from 'next'
import { Chewy, DynaPuff, Inter,  } from 'next/font/google'
import Navbar from './components/Navbar'
import Image from "next/image";
import logoBanner from '../public/logobanner3.png';
import { Kite_One } from 'next/font/google';
import './globals.css'
import { ScrollProvider } from './components/ScrollProvider';
import footer from '../public/bannerTrans.png'
import { MdPhoneInTalk as Phone } from 'react-icons/md'
import { MdEmail as Email } from 'react-icons/md'
import { MdLocationOn as Location } from 'react-icons/md'
import { Providers } from './providers';
import CartBar from './components/CartBar';
import { AuthProvider } from './context/AuthContext';

// const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DONUT STARS',
  description: 'Donut stars webite',
}

const textFont = Kite_One({
  weight: "400", subsets: ['latin'], variable: "--font-text", display:"swap"
}) 

const puff = DynaPuff({
  weight: "400", subsets: ['latin'], variable: "--font-puff", display: "swap"
}) 


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  
  return (
    <html lang="en" className={`${textFont.variable} ${puff.variable}`} 
      style={{width:"100%"}}
    >
      <body>
        <AuthProvider>
          <Providers>
            <ScrollProvider>

              {/* Navbar */}
              <Navbar />

              <div className='w-full flex-grow'>
                {children}
              </div>

              <CartBar />
              
              {/* footer */}
              <div className="flex xs:mt-80 my-0 footer-bg">

                <div className="flex flex-col basis-1/2 xs:p-10">
                  <div className="flex flex-col">
                    <h2>Contact us</h2>
                    <ul className="mt-3 xs:ml-3">
                      <li className="flex items-center">
                        <Phone size={25} />
                        <p className="ml-2">101001011</p>
                      </li>
                      <li className="flex items-center">
                        <Email size={25} />
                        <p className="ml-2">hobba@hobba.hhh</p>
                      </li>
                      <li className="flex items-center">
                        <Location size={25} />
                        <p className="ml-2">the street beside the building</p>
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col mt-10">
                    <h2>Follow us</h2>
                    <ul>
                      <li>FB</li>
                      <li>X</li>
                      <li>linkedin</li>
                      <li>insta</li>
                    </ul>
                  </div>
                </div>

                <Image src={footer} alt="footerImg" width={undefined} quality={100}
                  className="w-1/2 h-auto object-cover object-left" />

              </div>

            </ScrollProvider>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}

//bg-[url("./banner4.jpg")]
