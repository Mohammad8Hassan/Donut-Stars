import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'


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
        
        <div className='h-full overflow-auto'>
          {children}
        </div>
        
      </body>
    </html>
  )
}

//bg-[url("./banner4.jpg")]
