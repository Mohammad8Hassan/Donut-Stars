
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type ScrollContextType = {
  scrolled: boolean;
  scrollEl: React.RefObject<HTMLDivElement>;
};

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const scrollEl = useRef<HTMLDivElement>(null);

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
