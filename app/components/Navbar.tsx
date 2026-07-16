'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut, UserRound } from 'lucide-react'
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
    <header className="pointer-events-none sticky top-0 z-[1100] bg-transparent px-3 pt-2 sm:px-5 sm:pt-3">
      <div
        id="navBar"
        className={`pointer-events-auto mx-auto w-full max-w-[1400px] rounded-[24px] border transition-all duration-300 ${
          scrolled
            ? 'border-rose-200/90 bg-white/86 shadow-[0_16px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl'
            : 'border-rose-100 bg-gradient-to-r from-white/95 via-rose-50/95 to-amber-50/95 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md'
        }`}
      >
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5 lg:grid-cols-[1fr_auto_1fr] lg:gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {navItems.map((item) => {
              const isActive =
                item.url === '/'
                  ? pathname === item.url
                  : pathname === item.url || pathname.startsWith(`${item.url}/`)

              return (
                <Link
                  key={item.url}
                  href={item.url}
                  className={`rounded-xl border px-2.5 py-1.5 text-sm font-semibold leading-none transition-all duration-200 sm:px-3 sm:py-2 ${
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
            className="flex h-[4.1rem] w-[4.1rem] shrink-0 items-center justify-center self-center transition sm:h-[4.75rem] sm:w-[4.75rem]"
          >
            <div className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-rose-500/95 bg-white p-1.5 shadow-[0_14px_30px_rgba(244,63,94,0.22)] sm:border-4 sm:p-2">
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <Image src={logo} alt="Donut Stars logo" fill quality={100} className="object-cover" />
              </div>
            </div>
          </Link>

          {user ? (
            <div className="flex items-center justify-end gap-1.5 lg:min-w-0">
              {user.roleName === 'admin' ? (
                <Link
                  href="/admin"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-rose-100 sm:h-10"
                >
                  <LayoutDashboard className="h-4 w-4 text-rose-500" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              ) : null}

              <Link
                href="/account"
                className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-2 py-1.5 shadow-sm transition hover:border-rose-200 hover:bg-white/80"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.18)] sm:h-8 sm:w-8">
                  <UserRound className="h-4 w-4" />
                </div>
                <p className="max-w-[120px] truncate text-sm font-semibold text-zinc-900 sm:max-w-[180px]">{user.email}</p>
              </Link>

              <button
                onClick={handleLogOut}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 sm:h-10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1.5 lg:min-w-0">
              {/* <div className="hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-2 py-1.5 shadow-sm sm:flex">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.18)] sm:h-8 sm:w-8">
                  <UserRound className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-zinc-900">Account</p>
              </div> */}

              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-2xl border border-white/70 bg-white/70 px-3 text-sm font-semibold text-zinc-800 transition hover:border-rose-200 hover:bg-rose-50 sm:h-10"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center justify-center rounded-2xl bg-zinc-950 px-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 sm:h-10"
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
