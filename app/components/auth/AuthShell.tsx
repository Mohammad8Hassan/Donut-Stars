"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight, LucideIcon } from "lucide-react";

interface AuthShellProps {
  badge: string;
  title: string;
  description: string;
  footerLabel: string;
  footerHref: string;
  footerCta: string;
  asideTitle: string;
  asideDescription: string;
  asideStats: { label: string; value: string }[];
  icon: LucideIcon;
  imageSide?: "left" | "right";
  children: ReactNode;
}

export default function AuthShell({
  badge,
  title,
  description,
  footerLabel,
  footerHref,
  footerCta,
  asideTitle,
  asideDescription,
  asideStats,
  icon: Icon,
  imageSide = "left",
  children,
}: AuthShellProps) {
  const imageFirst = imageSide === "left";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7f1]">
      <div className="absolute inset-[-10%] bg-[radial-gradient(circle_at_15%_20%,rgba(251,113,133,0.45),transparent_24%),radial-gradient(circle_at_85%_18%,rgba(251,191,36,0.34),transparent_22%),radial-gradient(circle_at_25%_80%,rgba(255,255,255,0.75),transparent_26%),radial-gradient(circle_at_82%_72%,rgba(253,224,71,0.28),transparent_24%)] blur-3xl" />
      <div className="absolute inset-0 bg-white/22 backdrop-blur-[80px]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(255,247,241,0.52),rgba(255,255,255,0.28))]" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-rose-300/35 blur-[130px]" />
      <div className="absolute right-[-3rem] top-1/4 h-80 w-80 rounded-full bg-amber-200/35 blur-[140px]" />
      <div className="absolute bottom-[-4rem] left-1/3 h-72 w-72 rounded-full bg-white/40 blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="absolute inset-x-2 top-1/2 -z-10 h-[78%] -translate-y-1/2 rounded-[40px] bg-white/28 blur-[90px] sm:inset-x-6" />

        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/80 bg-white/78 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl xl:grid-cols-[0.88fr_1fr]">
          <section className={`relative hidden min-h-[620px] overflow-hidden xl:block ${imageFirst ? "xl:order-1" : "xl:order-2"}`}>
            <Image
              src="/asset3.jpg"
              alt="Donut Stars auth visual"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1280px) 42vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/30 via-zinc-950/18 to-zinc-950/42" />
          </section>

          <section className={`px-5 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8 ${imageFirst ? "xl:order-2" : "xl:order-1"}`}>
            <div className="mx-auto flex w-full max-w-lg flex-col justify-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_14px_28px_rgba(244,63,94,0.22)] xl:hidden">
                <Icon className="h-5 w-5" strokeWidth={2.1} />
              </div>

              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-500 sm:mt-5">
                {badge}
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl lg:text-[2rem]">
                {title}
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-600 sm:text-[15px]">
                {description}
              </p>

              <div className="mt-6">{children}</div>

              <p className="mt-5 text-sm text-zinc-600">
                {footerLabel}{" "}
                <Link
                  href={footerHref}
                  className="inline-flex items-center gap-1 font-semibold text-rose-500 transition hover:text-zinc-950"
                >
                  {footerCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
