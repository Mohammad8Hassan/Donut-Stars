import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Coffee, PackageOpen, Sparkles } from "lucide-react";
import donutList from "@/donut-list";
import drinksList from "@/drinks-list";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const highlightedDonuts = donutList.slice(0, 6);

export default function Home() {
  return (
    <main className="relative -mt-[7.5rem] overflow-hidden bg-[linear-gradient(180deg,#fff7f5_0%,#ffffff_24%,#fffaf3_100%)] pb-16 pt-[7.5rem] sm:-mt-[8.5rem] sm:pt-[8.5rem]">
      <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_34%)]" />

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
              Fresh daily, styled to match the app
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
              Big visuals, softer polish, and donuts that still lead the page.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
              A cleaner landing page with wider sections, warmer gradients, and
              room for the photography to do more of the work.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/buy"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-semibold text-zinc-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-100"
              >
                Order Donuts
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-sm font-medium text-white/70">
                Build 3, 6, or 12 packs with your favorite lineup.
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
                The carousel stays, but the section breathes more now.
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
                Same interaction idea, just restyled with the rounded card language
                from the rest of the app and given more room on the page.
              </p>
            </div>
          </div>

          <div className="mt-8 px-10 sm:px-12">
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-3">
                {highlightedDonuts.map((donut) => (
                  <CarouselItem
                    key={donut.id}
                    className="pl-3 md:basis-1/2 xl:basis-1/3"
                  >
                    <article className="group relative h-full overflow-hidden rounded-[32px] border border-zinc-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f6_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-2 hover:border-rose-200 hover:shadow-[0_26px_48px_rgba(244,63,94,0.14)]">
                      <div className="absolute inset-x-6 top-5 h-24 rounded-full bg-[radial-gradient(circle,rgba(251,113,133,0.16),transparent_72%)] opacity-0 transition duration-300 group-hover:opacity-100" />

                      <div className="relative flex items-center justify-between gap-3">
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500 transition duration-300 group-hover:border-rose-300 group-hover:bg-white">
                          {donut.tags?.[0] ?? "Signature"}
                        </span>
                      </div>

                      <div className="relative mt-4 h-64 rounded-[30px] bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.12),transparent_58%)] transition duration-300 group-hover:bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.18),transparent_62%)] sm:h-72">
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
                      <p className="mt-3 text-sm leading-6 text-zinc-600">
                        {donut.discription}
                      </p>
                    </article>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 h-11 w-11 border-rose-200 bg-white text-zinc-900 hover:bg-rose-50" />
              <CarouselNext className="right-0 h-11 w-11 border-rose-200 bg-white text-zinc-900 hover:bg-rose-50" />
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
                One wide section. One clear message. Build the box you want.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Choose a 3, 6, or 12 pack and fill it with the donuts you actually
                want. This section now leans on a larger image and a simpler message
                instead of splitting into multiple competing blocks.
              </p>
              <div className="mt-8 rounded-[28px] border border-zinc-100 bg-[linear-gradient(135deg,#fff7f5,#fffdf7)] p-5 text-sm font-semibold text-zinc-700 shadow-sm">
                Simple flow: pick a box size, choose your donuts, review the cart,
                and checkout.
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
                src="/landing/birthday.jpg"
                alt="Donuts for celebration"
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
                Add a drink, bring a box, and make it feel like an event.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                A couple of drinks are enough to support the order, and the larger
                imagery helps the page feel more like a landing experience instead
                of a list of small components.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {drinksList.map((drink) => (
                  <div
                    key={drink.id}
                    className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-semibold text-white">{drink.name}</p>
                    <p className="mt-1 text-sm text-white/60">{drink.price}</p>
                  </div>
                ))}
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
                Ready when you are
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
                Start an order that feels a little more special.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Wider sections, bigger imagery, cleaner structure, and the carousel
                still right where it should be.
              </p>

              <div className="mt-8">
                <Link
                  href="/buy"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500"
                >
                  Start Your Order
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative min-h-[300px] lg:min-h-[420px]">
              <Image
                src="/landing/asset2.jpg"
                alt="Large donut landing visual"
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
