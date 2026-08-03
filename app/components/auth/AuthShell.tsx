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
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
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
    </div>
  );
}
