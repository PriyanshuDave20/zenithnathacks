import type { CSSProperties, ReactNode } from "react";
import type { Step } from "./data";
import {
  ArrowRight,
  Captions,
  Check,
  Clear,
  Handoff,
  Keyboard,
  Mic,
  PictoBreath,
  PictoCalendar,
  PictoChest,
  PictoNo,
  PictoYes,
  Shield,
  Speaker,
} from "./icons";

/**
 * Small decorative visual under each "How it works" step: who holds the device, plus a mini
 * diagram of what happens. Synthetic demo content only; the phone beside it carries the real
 * detail, so everything here is aria-hidden. Pieces pop in one after another when the step
 * becomes active (reuses `.arrive`, which reduced motion already switches off).
 */

const chip =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-semibold text-ink ring-1 ring-line";
const chipOn =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-blue-deep px-3.5 text-sm font-semibold text-white";

/** One piece of a visual; `i` staggers its entrance. */
function Pop({ i, on, children }: { i: number; on: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex ${on ? "arrive" : ""}`}
      style={{ animationDelay: `${120 + i * 90}ms` } as CSSProperties}
    >
      {children}
    </span>
  );
}

function Tile({ children, label, picked }: { children: ReactNode; label: string; picked?: boolean }) {
  return (
    <span
      className={`flex w-[4.75rem] flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-semibold ring-1 ${
        picked ? "bg-blue-deep text-white ring-blue-deep shadow-soft" : "bg-surface text-ink-soft ring-line"
      }`}
    >
      {children}
      {label}
    </span>
  );
}

function Then() {
  return <ArrowRight size={14} className="shrink-0 text-ink-soft/70" />;
}

type Visual = { caption: string; render: (on: boolean) => ReactNode };

const visuals: Record<Step["id"], Visual> = {
  start: {
    caption: "Language, mode, start point",
    render: (on) => (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Pop i={0} on={on}>
            <span className={chipOn}>Español</span>
          </Pop>
          <Pop i={1} on={on}>
            <span className={chip}>العربية</span>
          </Pop>
          <Pop i={2} on={on}>
            <span className={chip}>中文</span>
          </Pop>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pop i={3} on={on}>
            <Tile label="Speak">
              <Mic size={20} />
            </Tile>
          </Pop>
          <Pop i={4} on={on}>
            <Tile label="Captions">
              <Captions size={20} />
            </Tile>
          </Pop>
          <Pop i={5} on={on}>
            <Tile label="Pictures" picked>
              <PictoChest size={20} />
            </Tile>
          </Pop>
          <Pop i={6} on={on}>
            <Tile label="Type">
              <Keyboard size={20} />
            </Tile>
          </Pop>
        </div>
      </div>
    ),
  },
  intake: {
    caption: "Tap, answer or speak",
    render: (on) => (
      <div className="flex flex-wrap items-center gap-2">
        <Pop i={0} on={on}>
          <Tile label="Chest" picked>
            <PictoChest size={26} />
          </Tile>
        </Pop>
        <Pop i={1} on={on}>
          <Tile label="Days">
            <PictoCalendar size={26} />
          </Tile>
        </Pop>
        <Pop i={2} on={on}>
          <Tile label="Breath">
            <PictoBreath size={26} />
          </Tile>
        </Pop>
      </div>
    ),
  },
  readback: {
    caption: "Confirm before it is sent",
    render: (on) => (
      <div className="flex flex-wrap items-center gap-2">
        <Pop i={0} on={on}>
          <span className={chip}>
            <Speaker size={16} className="text-blue-deep" />
            Read back
          </span>
        </Pop>
        <Then />
        <Pop i={1} on={on}>
          <span className={chipOn}>
            <Check size={16} />
            Confirmed
          </span>
        </Pop>
        <Then />
        <Pop i={2} on={on}>
          <span className={chip}>
            <Handoff size={16} className="text-blue-deep" />
            Hand back
          </span>
        </Pop>
      </div>
    ),
  },
  review: {
    caption: "Two views, side by side",
    render: (on) => (
      <div className="flex flex-wrap items-center gap-2">
        <Pop i={0} on={on}>
          <span className={chipOn}>English summary</span>
        </Pop>
        <Pop i={1} on={on}>
          <span className={chip}>Patient&rsquo;s own words</span>
        </Pop>
        <Pop i={2} on={on}>
          <span className={chip}>Read-back</span>
        </Pop>
      </div>
    ),
  },
  response: {
    caption: "Reply, then teach-back",
    render: (on) => (
      <div className="flex flex-wrap items-center gap-2">
        <Pop i={0} on={on}>
          <span className={chip}>
            <Speaker size={16} className="text-blue-deep" />
            Read aloud
          </span>
        </Pop>
        <Then />
        <Pop i={1} on={on}>
          <Tile label="Yes" picked>
            <PictoYes size={22} />
          </Tile>
        </Pop>
        <Pop i={2} on={on}>
          <Tile label="No">
            <PictoNo size={22} />
          </Tile>
        </Pop>
      </div>
    ),
  },
  end: {
    caption: "Three ways to clear",
    render: (on) => (
      <div className="flex flex-wrap items-center gap-2">
        <Pop i={0} on={on}>
          <span className={chip}>
            <Clear size={16} className="text-blue-deep" />
            Clear
          </span>
        </Pop>
        <Pop i={1} on={on}>
          <span className={chip}>End visit</span>
        </Pop>
        <Pop i={2} on={on}>
          <span className={chip}>Idle timeout</span>
        </Pop>
        <Pop i={3} on={on}>
          <span className={chipOn}>
            <Shield size={16} />
            Nothing kept
          </span>
        </Pop>
      </div>
    ),
  },
};

export function StepVisual({ step, active = true }: { step: Step; active?: boolean }) {
  const v = visuals[step.id];
  const clinician = step.holder === "Clinician";
  return (
    <div
      aria-hidden="true"
      className={`mt-6 max-w-[30rem] rounded-3xl bg-ground-2 p-4 ring-1 ring-line transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-60"
      }`}
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <span
          className={`rounded-full px-2.5 py-1 ${clinician ? "bg-navy text-white" : "bg-surface text-blue-deeper ring-1 ring-line"}`}
        >
          {step.holder}
        </span>
        <span>{v.caption}</span>
      </div>
      {/* key restarts the staggered entrance each time this step becomes the active one */}
      <div key={active ? "on" : "off"}>{v.render(active)}</div>
    </div>
  );
}
