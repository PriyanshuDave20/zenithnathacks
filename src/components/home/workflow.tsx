"use client";

import { useEffect, useRef, useState } from "react";
import { steps } from "./data";
import { Phone3D } from "./phone-3d";
import { StepScreen } from "./step-screens";
import { StepVisual } from "./step-visuals";

/**
 * "How it works": six steps scroll normally on the left while the page's pinned phone (phone-rail.tsx)
 * shows the active step on the right. On phones each step carries its own screen.
 */
export function Workflow() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  // Small screens: one phone, driven by a swipeable track of step cards.
  const [mActive, setMActive] = useState(0);
  const track = useRef<HTMLOListElement>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setMActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.6 },
    );
    cards.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const goTo = (i: number) => {
    const root = track.current, card = cards.current[i];
    if (!root || !card) return;
    root.scrollTo({
      left: root.scrollLeft + card.getBoundingClientRect().left - root.getBoundingClientRect().left - 16,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };
  const mPass = steps.slice(0, mActive + 1).reduce((n, s, i) => (i > 0 && s.holder !== steps[i - 1].holder ? n + 1 : n), 0);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);


  return (
    <section id="how" aria-labelledby="how-title" className="bg-ground">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-8 lg:pb-28 lg:pt-32">
        <h2
          id="how-title"
          className="max-w-[18ch] font-display text-[clamp(2.25rem,6vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.03em] [text-wrap:balance]"
        >
          One visit. One device, passed back and forth.
        </h2>
        <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-ink-soft">
          Six steps, from the clinician&rsquo;s first tap to a cleared screen. Each person only sees what is
          meant for them.
        </p>

        <div className="mt-14 lg:mt-6 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-16">
          {/* Small screens: one phone, and the six steps as a swipeable track that drives it */}
          <div className="lg:hidden">
            <Phone3D
              label={`Step ${mActive + 1}: ${steps[mActive].title}`}
              className="w-[min(17rem,100%,max(12.5rem,calc((100svh-27rem)*0.48)))]"
              swing={mPass}
              swingDir={steps[mActive].holder === "Patient" ? -1 : 1}
            >
              <div key={steps[mActive].id} className="screen-in flex min-h-0 flex-1 flex-col">
                <StepScreen step={steps[mActive]} index={mActive} />
              </div>
            </Phone3D>
            <div className="mt-4 flex justify-center gap-1" role="group" aria-label="Go to step">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={mActive === i ? "step" : undefined}
                  className="grid min-h-11 min-w-11 place-items-center"
                >
                  <span
                    className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${
                      i === mActive ? "w-8 bg-blue-deep" : "w-1.5 bg-line"
                    }`}
                  />
                </button>
              ))}
            </div>
            <ol
              ref={track}
              className="-mx-4 mt-2 flex items-start snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
            >
              {steps.map((s, i) => (
                <li
                  key={s.id}
                  ref={(el) => {
                    cards.current[i] = el;
                  }}
                  data-index={i}
                  className="w-[86%] max-w-[26rem] shrink-0 snap-start rounded-[1.75rem] bg-surface p-4 shadow-soft ring-1 ring-line"
                >
                  <span
                    className={`grid size-10 place-items-center rounded-full font-display text-base font-bold transition-colors duration-300 ${
                      mActive === i ? "bg-blue-deep text-white" : "bg-ground-2 text-ink-soft"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-bold leading-[1.2] tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-soft">{s.body}</p>
                  <StepVisual step={s} />
                </li>
              ))}
            </ol>
          </div>

          <ol className="hidden flex-col lg:flex">
            {steps.map((s, i) => (
              <li
                key={s.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-index={i}
                data-phone-screen={`step-${i}`}
                aria-current={active === i ? "step" : undefined}
                className="lg:flex lg:min-h-[78vh] lg:items-center"
              >
                <div
                  className={`lg:max-w-[30rem] [&_h3]:transition-colors [&_h3]:duration-300 ${
                    active === i ? "" : "lg:[&_h3]:text-ink-soft"
                  }`}
                >
                  <span
                    className={`grid size-11 place-items-center rounded-full font-display text-lg font-bold transition-colors duration-300 ${
                      active === i ? "bg-blue-deep text-white" : "bg-ground-2 text-ink-soft"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-bold leading-[1.15] tracking-[-0.02em] sm:text-4xl">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-[34rem] text-lg leading-relaxed text-ink-soft">{s.body}</p>
                  <StepVisual step={s} active={active === i} />
                </div>
              </li>
            ))}
          </ol>

          {/* Large screens: this column is where the page's pinned phone sits (see phone-rail.tsx) */}
          <div aria-hidden="true" className="hidden lg:block" />
        </div>
      </div>
    </section>
  );
}
