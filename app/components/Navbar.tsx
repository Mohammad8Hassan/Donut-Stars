'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, UserRound } from 'lucide-react'
import logo from '@/public/logo.png'
import { useAuth } from '../context/useAuth'
import { useScroll } from './ScrollProvider'
import navItems from './navItems'

export default function Navbar() {
  const pathname = usePathname()
  const { scrolled } = useScroll()
  const { user, setUser } = useAuth()

  const handleLogOut = async () => {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        setUser(null)
      } else {
        console.error('Failed to log out')
      }
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <header className="pointer-events-none sticky top-0 z-[1000] bg-transparent px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        id="navBar"
        className={`pointer-events-auto mx-auto w-full max-w-[1400px] rounded-[28px] border transition-all duration-300 ${
          scrolled
            ? 'border-rose-200/80 bg-white/80 shadow-[0_16px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl'
            : 'border-rose-100 bg-gradient-to-r from-white/95 via-rose-50/95 to-amber-50/95 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md'
        }`}
      >
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const isActive =
                item.url === '/'
                  ? pathname === item.url
                  : pathname === item.url || pathname.startsWith(`${item.url}/`)

              return (
                <Link
                  key={item.url}
                  href={item.url}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold leading-none transition-all duration-200 sm:px-4 ${
                    isActive
                      ? 'border-rose-200 bg-rose-100 text-zinc-950 shadow-[0_10px_20px_rgba(244,63,94,0.12)]'
                      : 'border-white/70 bg-white/70 text-zinc-800 hover:border-rose-200 hover:bg-rose-50 hover:text-zinc-950'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          <Link
            href="/"
            aria-label="Go to home"
            className="flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center self-center transition sm:h-[5.25rem] sm:w-[5.25rem]"
          >
            <div className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full sm:h-20 sm:w-20">
              <Image src={logo} alt="Donut Stars logo" fill quality={100} className="object-cover" />
            </div>
          </Link>

          {user ? (
            <div className="flex items-center justify-end gap-2 lg:min-w-0">
              <Link
                href="/account"
                className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-2.5 py-2 shadow-sm transition hover:border-rose-200 hover:bg-white/80"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.18)]">
                  <UserRound className="h-4 w-4" />
                </div>
                <p className="max-w-[120px] truncate text-sm font-semibold text-zinc-900 sm:max-w-[180px]">{user.email}</p>
              </Link>

              <button
                onClick={handleLogOut}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 lg:min-w-0">
              <div className="hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-2.5 py-2 shadow-sm sm:flex">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.18)]">
                  <UserRound className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-zinc-900">Account</p>
              </div>

              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/70 bg-white/70 px-3 text-sm font-semibold text-zinc-800 transition hover:border-rose-200 hover:bg-rose-50"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
