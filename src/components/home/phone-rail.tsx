"use client";

import { useEffect, useRef, useState } from "react";
import { steps } from "./data";
import { HeroDemo } from "./hero-exchange";
import { Panel, modes } from "./modes";
import { ScreenBar } from "./phone";
import { Phone3D } from "./phone-3d";
import { useModesState } from "./rail-store";
import { Keyboard } from "./icons";
import { PrivacyScreen, StepScreen } from "./step-screens";

/**
 * Large screens: ONE phone for the whole page, pinned on the right with CSS `position: sticky`, so
 * the browser keeps it locked to the screen while the sections scroll past on the left (no
 * script-driven positioning, so it cannot lag or jump, and it never travels sideways).
 *
 * Its screen follows whatever is at the middle of the viewport: any element with
 * `data-phone-screen` ("hero", "step-0".."step-5", "modes", "privacy"). Each change swaps the screen
 * with the screen-in entrance and swings the phone toward whoever holds it now.
 * Small screens keep their own in-flow phones in each section.
 */
/** The input bar at the foot of the modes screen, in each mode's own way of answering. */
const COMPOSER: Record<string, string> = {
  language: "Speak or type",
  deaf: "Type an answer",
  literacy: "Tap a picture",
  mute: "Tap to speak",
};

export function PhoneRail() {
  const [screen, setScreen] = useState("hero");
  const [swing, setSwing] = useState(0);
  const { mode, lang, setLang } = useModesState();
  const current = useRef("hero");

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-phone-screen]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const next = (e.target as HTMLElement).dataset.phoneScreen!;
          if (next === current.current) continue;
          current.current = next;
          setScreen(next);
          setSwing((n) => n + 1);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const stepIndex = screen.startsWith("step-") ? Number(screen.slice(5)) : -1;
  const holder =
    stepIndex >= 0 ? steps[stepIndex].holder : screen === "modes" || screen === "hero" ? "Patient" : "Clinician";
  const m = modes[mode];

  return (
    <div data-phone-rail className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
      <div className="mx-auto flex h-full max-w-6xl justify-end px-8">
        <div className="flex w-[22rem] justify-center">
          <div className="pointer-events-auto sticky top-16 flex h-[calc(100svh-4rem)] flex-col items-center justify-center">
            <HeroDemo paused={screen !== "hero"}>
              {(heroScreen, heroControl, heroLabel) => {
                let label = heroLabel;
                let content = heroScreen;
                let below = heroControl;
                if (stepIndex >= 0) {
                  label = `Step ${stepIndex + 1}: ${steps[stepIndex].title}`;
                  content = <StepScreen step={steps[stepIndex]} index={stepIndex} />;
                  below = (
                    <div className="flex justify-center gap-2" aria-hidden="true">
                      {steps.map((s, i) => (
                        <span
                          key={s.id}
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            i === stepIndex ? "w-8 bg-blue-deep" : "w-1.5 bg-line"
                          }`}
                        />
                      ))}
                    </div>
                  );
                } else if (screen === "modes") {
                  label = `Patient screen: ${m.tab}`;
                  content = (
                    <>
                      <ScreenBar holder="Patient" step={m.short} />
                      <div className="min-h-0 flex-1 overflow-hidden px-4 pt-4">
                        <Panel mode={m.id} lang={lang} setLang={setLang} compact />
                      </div>
                      <div className="px-4 pb-5 pt-3">
                        <span className="flex min-h-12 min-w-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-base text-ink-soft ring-1 ring-line">
                          <Keyboard size={18} className="shrink-0" />
                          <span className="truncate">{COMPOSER[m.id]}</span>
                        </span>
                      </div>
                    </>
                  );
                  below = <p className="text-sm font-medium text-ink-soft">What the patient sees</p>;
                } else if (screen === "privacy") {
                  label = "Privacy: what this session keeps";
                  content = <PrivacyScreen />;
                  below = null;
                }
                return (
                  <>
                    <Phone3D
                      label={label}
                      className="w-[min(20.5rem,calc((100svh-12rem)*0.48))]"
                      swing={swing}
                      swingDir={holder === "Patient" ? -1 : 1}
                    >
                      <div key={screen === "modes" ? `modes-${m.id}` : screen} className="screen-in flex min-h-0 flex-1 flex-col">
                        {content}
                      </div>
                    </Phone3D>
                    <div className="mt-6 flex h-11 items-center justify-center">{below}</div>
                  </>
                );
              }}
            </HeroDemo>
          </div>
        </div>
      </div>
    </div>
  );
}
