import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Coffee, PackageOpen, Sparkles } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import QuantitySelector from "./components/QuantitySelector";
import { fetchMenu } from "@/lib/menu";
import { IItem } from "@/types";

// Homepage "drinks and occasions" teaser only has room for two sample
// drinks — pinned to these specific DB products rather than an arbitrary
// slice of the category.
const FEATURED_DRINK_IDS = ["13", "9"];

// This page fetches the live menu from the DB on every load. Without this,
// Next.js tries to prerender it to static HTML at `next build` time, which
// means hitting the database *during the build step* — on hosts like
// Railway the build container doesn't have the same private-network access
// to the DB that the running service gets, so that build-time query fails
// outright. force-dynamic renders this per-request instead, which also
// means the homepage always reflects current product data, not whatever
// was in the DB the moment it was built.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { donuts, drinks } = await fetchMenu();
  const highlightedDonuts = donuts.filter((donut) => donut.tags && donut.tags.length > 0).slice(0, 6);
  const featuredDrinks = FEATURED_DRINK_IDS.map((id) =>
    drinks.find((drink) => drink.id === id)
  ).filter((drink): drink is IItem => Boolean(drink));

  return (
    <main className="relative overflow-hidden pb-16">
      <div className="absolute inset-x-0 top-0 h-[34rem] " />

      <section className="relative mx-auto w-full max-w-[1400px] px-4 pb-6 pt-2 sm:px-6 lg:px-8 lg:pb-8">
        <div className="relative min-h-[72vh] overflow-hidden rounded-[40px] border border-rose-100 bg-zinc-950 shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
          <Image
            src="/landing/freshwindow.jpg"
            alt="Fresh donuts in the display"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,24,27,0.80)_0%,rgba(24,24,27,0.52)_38%,rgba(24,24,27,0.18)_100%)]" />

          <div className="relative flex min-h-[72vh] max-w-3xl flex-col justify-center px-6 py-10 text-white sm:px-8 lg:px-12">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200 backdrop-blur-md">
              <Sparkles className="h-4 w-4" />
              Baked fresh every morning
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
              Handcrafted donuts, made fresh and delivered warm.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
              From classic glazed to our seasonal specials, every donut is
              made from scratch each morning using real butter, real fruit,
              and no shortcuts.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-semibold text-zinc-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-100"
              >
                Order Donuts
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-sm font-medium text-white/70">
                Mix and match your favorites in a 3, 6, or 12 pack.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[40px] border border-rose-100 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">
                Top picks
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                Customer favorites, fresh out of the case.
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
                These are the donuts our regulars keep coming back for, from
                the classics to a few flavors that only stick around for a
                season.
              </p>
            </div>

            <Link
              href="/menu"
              className="inline-flex h-12 w-fit shrink-0 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500"
            >
              View full menu
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 px-1 sm:px-12">
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-3">
                {highlightedDonuts.map((donut) => (
                  <CarouselItem
                    key={donut.id}
                    className="pl-3 md:basis-1/2 xl:basis-1/3"
                  >
                    <article className="group relative flex h-full flex-col rounded-[32px] border bg-[linear-gradient(180deg,#ffffff_0%,#fff8f6_100%)] p-5 transition duration-200 border-rose-200 ">
                      {/* <div className="absolute inset-x-6 top-5 h-24 rounded-full bg-[radial-gradient(circle,rgba(251,113,133,0.16),transparent_72%)] opacity-0 transition duration-300 group-hover:opacity-100" /> */}

                      {donut.tags?.[0] && (
                        <div className="relative flex items-center justify-between gap-3">
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500 transition duration-300 group-hover:border-rose-300 group-hover:bg-white">
                            {donut.tags[0]}
                          </span>
                        </div>
                      )}

                      <div className="relative mt-4 h-64 overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.12),transparent_58%)] transition duration-300 group-hover:bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.18),transparent_62%)] sm:h-72">
                        <Image
                          src={`/${donut.image}`}
                          alt={donut.name}
                          fill
                          className="object-contain p-2 transition duration-500 group-hover:scale-[1.12] group-hover:-rotate-2 sm:p-0"
                        />
                      </div>

                      <h3 className="mt-4 text-xl font-black tracking-tight text-zinc-950 transition duration-300 group-hover:text-rose-600">
                        {donut.name}
                      </h3>
                      <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-600">
                        {donut.discription}
                      </p>

                      <div className="mt-4 rounded-[22px] border border-zinc-200 bg-zinc-50 p-1.5 shadow-inner">
                        <QuantitySelector item={donut} />
                      </div>
                    </article>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 z-10 h-9 w-9 border-rose-200 bg-white/90 text-zinc-900 shadow-md backdrop-blur-sm hover:bg-rose-50 sm:left-0 sm:h-11 sm:w-11 sm:bg-white sm:shadow-none sm:backdrop-blur-0" />
              <CarouselNext className="right-2 z-10 h-9 w-9 border-rose-200 bg-white/90 text-zinc-900 shadow-md backdrop-blur-sm hover:bg-rose-50 sm:right-0 sm:h-11 sm:w-11 sm:bg-white sm:shadow-none sm:backdrop-blur-0" />
            </Carousel>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[40px] border border-rose-100 bg-white shadow-[0_26px_60px_rgba(15,23,42,0.10)]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">
                <PackageOpen className="h-4 w-4" />
                Custom boxes
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
                Build a box that&apos;s exactly what your table wants.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Pick a size, then fill it with whatever mix you&apos;re craving.
                Great for the office, a birthday, or just a Friday that
                deserves donuts.
              </p>
              <div className="mt-8 rounded-[28px] border border-zinc-100 bg-[linear-gradient(135deg,#fff7f5,#fffdf7)] p-5 text-sm font-semibold text-zinc-700 shadow-sm">
                Pick a box size, choose your donuts, review your cart, and
                check out.
              </div>

              <div className="mt-6">
                <Link
                  href="/menu?tab=boxes"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500"
                >
                  Build a box
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative min-h-[340px] lg:min-h-[520px]">
              <Image
                src="/landing/12bbox.jpg"
                alt="Large donut box assortment"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[40px] border border-rose-100 bg-zinc-950 text-white shadow-[0_28px_70px_rgba(15,23,42,0.16)]">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative order-2 min-h-[320px] lg:order-1 lg:min-h-[500px]">
              <Image
                src="/caramelFrappe.jpg"
                alt="Iced caramel frappe"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,24,27,0.36),rgba(24,24,27,0.18))]" />
            </div>

            <div className="order-1 flex flex-col justify-center p-6 sm:p-8 lg:order-2 lg:p-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
                <Coffee className="h-4 w-4" />
                Drinks and occasions
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Add a drink, bring a box, make it an occasion.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                Pair your box with a hot or iced coffee and you&apos;ve got
                breakfast, a birthday, or an office treat covered in one
                order.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {featuredDrinks.map((drink) => (
                  <div
                    key={drink.id}
                    className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-semibold text-white">{drink.name}</p>
                    <p className="mt-1 text-sm text-white/60">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(drink.price)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Link
                  href="/menu?tab=drinks"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-100"
                >
                  Shop drinks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[40px] border border-rose-100 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_45%,#fff7ed_100%)] shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-500">
                Who we are
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
                Made by people who love donuts.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Behind every box is a small team of bakers and drivers who
                show up before sunrise to make sure everything&apos;s fresh, fast,
                and made with care — from the first proof to the last
                delivery.
              </p>
            </div>

            <div className="relative min-h-[300px] lg:min-h-[420px]">
              <Image
                src="/job.jpg"
                alt="Our team at work"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
