
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type ScrollContextType = {
  scrolled: boolean;
  scrollEl: React.RefObject<HTMLDivElement>;
};

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const scrollEl = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = scrollEl.current;
    if (!el) return;

    const handleScroll = () => {
      // console.log("scrollTOP: ", el.scrollTop)
      setScrolled(el.scrollTop > 0);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // #rootDiv below is the app's actual scroll container (overflow-y-auto on
  // a div, not window/body), so Next's router — which only resets window
  // scroll on navigation — never resets it. Without this, landing on a page
  // after leaving one that was scrolled down (e.g. /order-confirmation after
  // a tall /payment form) renders already scrolled. Keyed on pathname only
  // (not full URL) so in-page search-param changes, like /menu?tab=, don't
  // reset scroll on a tab switch.
  useEffect(() => {
    if (scrollEl.current) {
      scrollEl.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <ScrollContext.Provider value={{ scrolled, scrollEl }}>
      <div ref={scrollEl} id="rootDiv" className='h-full w-full overflow-y-auto flex flex-col' style={{}}>
        {children}
      </div>
    </ScrollContext.Provider>
  );
}

export function useScroll() {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error("useScroll must be used inside ScrollProvider");
  return ctx;
}
