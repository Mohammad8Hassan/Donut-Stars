import './globals.css'
import type { Metadata } from 'next'
import { DynaPuff, Kite_One } from 'next/font/google'
import Navbar from './components/Navbar'
import { ScrollProvider } from './components/ScrollProvider'
import { Providers } from './providers'
import CartBar from './components/CartBar'
import { AuthProvider } from './context/AuthContext'
import Footer from './components/Footer'

export const metadata: Metadata = {
  title: 'DONUT STARS',
  description: 'Donut stars webite',
}

const textFont = Kite_One({
  weight: '400', subsets: ['latin'], variable: '--font-text', display: 'swap'
})

const puff = DynaPuff({
  weight: '400', subsets: ['latin'], variable: '--font-puff', display: 'swap'
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${textFont.variable} ${puff.variable} min-h-screen`} style={{ width: '100%' }}>
      <body className="min-h-screen bg-zinc-50">
        <AuthProvider>
          <Providers>
            <ScrollProvider>
              <div className="flex min-h-screen flex-col shrink-0 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_34%)]">
                <Navbar />

                <main className="flex w-full flex-col mt-4 min-h-[90vh] shrink-0">
                  {children}
                </main>

                <CartBar />
                <div className="shrink-0">
                  <Footer />
                </div>
              </div>
            </ScrollProvider>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}
