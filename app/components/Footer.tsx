import Image from 'next/image'
import Link from 'next/link'
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
} from 'lucide-react'
import footerBanner from '@/public/asset3.jpg'

const contactItems = [
  {
    label: 'Phone',
    value: '(555) 204-8890',
    href: 'tel:+15552048890',
    icon: Phone,
  },
  {
    label: 'Email',
    value: 'hello@donutstars.com',
    href: 'mailto:hello@donutstars.com',
    icon: Mail,
  },
  {
    label: 'Location',
    value: '482 Maple Avenue, Portland, OR',
    href: '#',
    icon: MapPin,
  },
]

const socialItems = [
  { label: 'Instagram', href: '#', icon: Instagram },
  { label: 'Facebook', href: '#', icon: Facebook },
  { label: 'X', href: '#', icon: Twitter },
  { label: 'LinkedIn', href: '#', icon: Linkedin },
]

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-rose-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_28%)]" />

      <div className="relative mx-auto grid min-h-[360px] w-full max-w-[1600px] lg:grid-cols-2">
        <div className="flex justify-center px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="w-full max-w-[520px] self-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-300">
              Donut Stars
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Contact us for orders, custom boxes, or any questions about your delivery.
            </h2>

            <div className="mt-8 space-y-4">
              {contactItems.map(({ label, value, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white/90 shadow-[0_10px_22px_rgba(0,0,0,0.18)] backdrop-blur-sm transition hover:border-rose-300/40 hover:bg-white/14"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_12px_24px_rgba(244,63,94,0.28)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      {label}
                    </span>
                    <span className="mt-1 block text-sm font-semibold sm:text-base">{value}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {socialItems.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white/85 shadow-[0_10px_22px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:border-rose-300/40 hover:bg-white/14 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* <div className="relative min-h-[280px] overflow-hidden self-stretch lg:min-h-full">
          <Image
            src={footerBanner}
            alt="Donut Stars assortment"
            fill
            className="object-cover object-center scale-[1.08]"
            priority={false}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,24,27,0.9)_0%,rgba(24,24,27,0.5)_18%,rgba(24,24,27,0.18)_46%,rgba(24,24,27,0.3)_100%),linear-gradient(180deg,rgba(24,24,27,0.34)_0%,rgba(24,24,27,0.08)_28%,rgba(24,24,27,0.4)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-transparent sm:w-32 lg:w-40" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900/90 to-transparent sm:h-20" />
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-zinc-950/55 to-transparent sm:h-16" />
        </div> */}
      </div>
    </footer>
  )
}
