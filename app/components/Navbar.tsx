'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, UserRound, X } from 'lucide-react'
import logo from '@/public/logo.png'
import { useAuth } from '../context/useAuth'
import { useScroll } from './ScrollProvider'
import navItems from './navItems'
import ActiveOrdersStrip from './ActiveOrdersStrip'

export default function Navbar() {
  const pathname = usePathname()
  const { scrolled } = useScroll()
  const { user, checked, setUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  // /track is the guest-only lookup tool — once we're sure someone is
  // logged in, they have app/account/active-orders instead. Stays visible
  // until `checked` resolves so guests never see it disappear-then-flash.
  const visibleNavItems = navItems.filter((item) => item.url !== '/track' || !(checked && user))

  const isNavItemActive = (url: string) =>
    url === '/' ? pathname === url : pathname === url || pathname.startsWith(`${url}/`)

  const navLinkClassName = (isActive: boolean) =>
    isActive
      ? 'border-rose-200 bg-rose-100 text-zinc-950 shadow-[0_10px_20px_rgba(244,63,94,0.12)]'
      : 'border-white/70 bg-white/70 text-zinc-800 hover:border-rose-200 hover:bg-rose-50 hover:text-zinc-950'

  const activeNavItem = visibleNavItems.find((item) => isNavItemActive(item.url))

  // Collapse the mobile nav dropdown on navigation and on outside clicks —
  // it's an inline panel, not a full-screen overlay, so nothing else closes it.
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen])

  const handleLogOut = async () => {
    // Guard against rapid repeated clicks firing multiple concurrent
    // /api/logout requests before the button's disabled state re-renders.
    if (isLoggingOut) return

    setIsLoggingOut(true)
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
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header ref={headerRef} className="pointer-events-none sticky top-0 z-[1100] bg-transparent px-3 pt-2 sm:px-5 sm:pt-3">
      <div
        id="navBar"
        className={`pointer-events-auto mx-auto w-full max-w-[1400px] rounded-[24px] border transition-all duration-300 ${
          scrolled
            ? 'border-rose-200/90 bg-white/86 shadow-[0_16px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl'
            : 'border-rose-100 bg-gradient-to-r from-white/95 via-rose-50/95 to-amber-50/95 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md'
        }`}
      >
        <div className="grid grid-cols-[1fr_auto] items-center gap-y-0.5 px-2.5 py-1 sm:px-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-3 sm:py-0">
          <div className="flex items-center gap-1.5">
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.url}
                  href={item.url}
                  className={`rounded-xl border px-2.5 py-1.5 text-sm font-semibold leading-none transition-all duration-200 sm:px-3 sm:py-2 ${navLinkClassName(
                    isNavItemActive(item.url)
                  )}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
              className="flex h-9 items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-2.5 text-zinc-800 transition hover:border-rose-200 hover:bg-rose-50 hover:text-zinc-950 sm:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 shrink-0" /> : <Menu className="h-5 w-5 shrink-0" />}
              <span className="max-w-[9rem] truncate text-sm font-semibold">{activeNavItem?.name ?? 'Menu'}</span>
            </button>
          </div>

          <Link
            href="/"
            aria-label="Go to home"
            className="group relative flex h-[4.1rem] w-[4.1rem] shrink-0 items-center justify-center self-center transition duration-300 hover:-translate-y-0.5 sm:h-[4.75rem] sm:w-[4.75rem]"
          >
            {/* neon halo — blurred color bleeding out from behind the badge */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-rose-500 opacity-25 blur-md transition-all duration-300 group-hover:opacity-40 group-hover:blur-lg"
            />
            <div
              className="relative flex h-full w-full items-center justify-center rounded-full border-2 border-rose-400/80
                bg-white shadow-[0_0_6px_1px_rgba(244,63,94,0.3),0_0_14px_3px_rgba(244,63,94,0.15),0_14px_30px_rgba(15,23,42,0.18)]
                ring-1 ring-white/80 transition-shadow duration-300
                group-hover:shadow-[0_0_10px_2px_rgba(244,63,94,0.4),0_0_20px_5px_rgba(244,63,94,0.2),0_14px_30px_rgba(15,23,42,0.18)]
                sm:border-[3px]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <Image src={logo} alt="Donut Stars logo" fill quality={100} className="object-cover" />
              </div>
            </div>
          </Link>

          <div className="col-span-2 flex flex-wrap items-center justify-center gap-2 lg:col-span-1 lg:flex-nowrap lg:justify-end lg:min-w-0">
            {user ? (
              <div
                className="order-1 flex flex-wrap items-center justify-center gap-1.5 lg:order-2 lg:flex-nowrap
                  lg:justify-end lg:gap-1.5 lg:rounded-2xl lg:border lg:border-white/70 lg:bg-white/60 lg:py-1.5
                  lg:pl-2 lg:pr-1.5 lg:shadow-sm lg:transition lg:hover:border-rose-200 lg:hover:bg-white/80 lg:min-w-0"
              >
                <Link
                  href="/account"
                  className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-2 py-1.5
                    shadow-sm transition hover:border-rose-200 hover:bg-white/80 lg:order-1 lg:rounded-none lg:border-0
                    lg:bg-transparent lg:px-1 lg:py-0 lg:shadow-none lg:transition-none lg:hover:border-0 lg:hover:bg-transparent"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.18)] sm:h-8 sm:w-8">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <p className="max-w-[120px] truncate text-sm font-semibold text-zinc-900 sm:max-w-[180px]">{user.name}</p>
                </Link>

                <div className="hidden h-6 w-px bg-zinc-200 lg:order-2 lg:block" />

                {user.roleName === 'admin' ? (
                  <Link
                    href="/admin"
                    title="Admin dashboard"
                    className="inline-flex h-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50
                      px-3 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-rose-100 sm:h-10
                      lg:order-3 lg:h-8 lg:w-auto lg:rounded-xl lg:border-0 lg:bg-transparent lg:px-2.5 lg:text-rose-500
                      lg:shadow-none lg:hover:translate-y-0 lg:hover:bg-rose-50"
                  >
                    Admin
                  </Link>
                ) : null}

                <button
                  onClick={handleLogOut}
                  disabled={isLoggingOut}
                  title="Logout"
                  aria-label={isLoggingOut ? 'Logging out' : 'Logout'}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 text-sm font-semibold
                    text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500 disabled:cursor-not-allowed
                    disabled:opacity-60 disabled:hover:translate-y-0 sm:h-10 lg:order-4 lg:h-8 lg:w-8 lg:rounded-xl
                    lg:bg-transparent lg:p-0 lg:text-zinc-500 lg:hover:translate-y-0 lg:hover:bg-zinc-950 lg:hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline lg:hidden">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            ) : (
              <div className="order-1 flex flex-wrap items-center justify-center gap-1.5 lg:order-2 lg:justify-end lg:min-w-0">
                {/* <div className="hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-2 py-1.5 shadow-sm sm:flex">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.18)] sm:h-8 sm:w-8">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">Account</p>
                </div> */}

                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 sm:h-10"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 sm:h-10"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <div className="order-2 flex flex-wrap items-center justify-center gap-2 lg:order-1">
              <ActiveOrdersStrip />
            </div>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div id="mobile-nav-panel" className="flex flex-col gap-1.5 border-t border-rose-100/70 px-2.5 pb-2.5 pt-2 sm:hidden">
            {visibleNavItems.map((item) => (
              <Link
                key={item.url}
                href={item.url}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200 ${navLinkClassName(
                  isNavItemActive(item.url)
                )}`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  )
}
