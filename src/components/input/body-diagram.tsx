"use client";

// Body diagram for "Where does it hurt?" (Backend 2 input channel, tap first; gaze builds on it).
// One continuous body, front and back: the patient taps anywhere and a soft red spot lands exactly there
// (tap a spot again to remove it). The part geometry below is invisible; it only names the part under
// each spot, so `onSelect` still emits the contract's RegionId and labels stay readable.
// `BodyMap` draws the same body read-only, so the clinician sees the exact spots.
// Anatomy is never mirrored for right-to-left languages: the patient's right is always on the
// viewer's left in the front view.
import { memo, useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { BodyDiagramProps, RegionId } from "@/lib/contracts/input";
import { DIAGRAM_TEXT, getBodyPart, spotLabels, spotParts, type BodySpot, type BodyView } from "@/lib/input/body-parts";

type Lang = keyof typeof DIAGRAM_TEXT;

export type BodyDiagramFullProps = BodyDiagramProps & {
  lang: Lang;
  /** Where the patient has touched so far. */
  spots: BodySpot[];
  /** The new list after every tap; `added` is the spot just placed (absent when one was removed). */
  onSpotsChange: (spots: BodySpot[], added?: BodySpot) => void;
};

/* ---------- Geometry (viewBox 240 x 480, figure centred on x = 120) ----------
   Sided pieces are drawn once on the viewer's left and mirrored onto the right. */

const W = 240;
const MIRROR = `matrix(-1 0 0 1 ${W} 0)`;

type Shape =
  | { kind: "path"; d: string }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number };

const HEAD: Shape = { kind: "ellipse", cx: 120, cy: 40, rx: 25, ry: 30 };
const NECK: Shape = { kind: "path", d: "M107 60 L133 60 L135 90 L105 90 Z" };
const TORSO: Shape = {
  kind: "path",
  d: "M108 84 C94 86 80 88 72 98 C64 108 64 124 68 138 L78 150 C80 176 82 194 80 208 C76 226 72 242 74 260 C76 274 86 282 100 286 L120 292 L140 286 C154 282 164 274 166 260 C168 242 164 226 160 208 C158 194 160 176 162 150 L172 138 C176 124 176 108 168 98 C160 88 146 86 132 84 Z",
};
const ARM: Shape = {
  kind: "path",
  d: "M72 96 C58 102 50 118 47 138 L27 284 L50 290 L66 206 L80 146 L76 112 Z",
};
const HAND: Shape = {
  kind: "path",
  d: "M26 282 C18 291 14 305 15 319 C16 335 26 347 38 346 C50 345 55 333 54 319 C53 307 52 297 51 287 Z M19 294 C10 300 6 310 8 316 C11 320 16 316 19 310 Z",
};
const LEG: Shape = {
  kind: "path",
  d: "M74 252 C69 298 72 340 77 380 L83 434 L107 434 L111 380 C115 340 118 312 119 292 L100 286 Z",
};
const FOOT: Shape = { kind: "path", d: "M82 430 C78 442 75 454 79 462 C85 469 105 469 110 462 C113 454 110 442 108 430 Z" };

type ClipName = "head" | "neck" | "torso" | "arms" | "legs" | "body";

const CLIP_SHAPES: Record<ClipName, { shape: Shape; both: boolean }[]> = {
  head: [{ shape: HEAD, both: false }],
  neck: [{ shape: NECK, both: false }],
  torso: [{ shape: TORSO, both: false }],
  arms: [{ shape: ARM, both: true }],
  legs: [{ shape: LEG, both: true }],
  body: [HEAD, NECK, TORSO].map((shape) => ({ shape, both: false })).concat([ARM, HAND, LEG, FOOT].map((shape) => ({ shape, both: true }))),
};

/** An invisible piece that names the part under a tap. `key` is the part id, or the sided key (e.g. "knee") when `sided`. */
type Piece = { key: string; sided: boolean; shape: Shape; clip?: ClipName; anchor: [number, number] };

// Shared limb pieces; draw order matters, later pieces sit on top and win the tap.
const ARM_PIECES: Piece[] = [
  { key: "upper_arm", sided: true, shape: { kind: "rect", x: 0, y: 90, w: 84, h: 102 }, clip: "arms", anchor: [60, 162] },
  { key: "forearm", sided: true, shape: { kind: "rect", x: 0, y: 192, w: 84, h: 110 }, clip: "arms", anchor: [45, 248] },
  { key: "elbow", sided: true, shape: { kind: "ellipse", cx: 53, cy: 198, rx: 19, ry: 14 }, clip: "arms", anchor: [53, 198] },
  { key: "hand", sided: true, shape: HAND, anchor: [35, 318] },
];

const FRONT: Piece[] = [
  ...ARM_PIECES,
  { key: "thigh", sided: true, shape: { kind: "rect", x: 40, y: 240, w: 90, h: 132 }, clip: "legs", anchor: [95, 326] },
  { key: "shin", sided: true, shape: { kind: "rect", x: 40, y: 372, w: 90, h: 70 }, clip: "legs", anchor: [95, 410] },
  { key: "knee", sided: true, shape: { kind: "ellipse", cx: 94, cy: 374, rx: 24, ry: 17 }, clip: "legs", anchor: [94, 374] },
  { key: "foot", sided: true, shape: FOOT, anchor: [95, 453] },
  { key: "abdomen", sided: false, shape: { kind: "rect", x: 40, y: 140, w: 160, h: 160 }, clip: "torso", anchor: [120, 210] },
  {
    key: "chest",
    sided: false,
    shape: { kind: "path", d: "M40 76 H200 V160 C182 160 162 150 146 150 C132 150 128 172 120 172 C112 172 108 150 94 150 C78 150 58 160 40 160 Z" },
    clip: "torso",
    anchor: [120, 124],
  },
  { key: "groin", sided: false, shape: { kind: "path", d: "M90 254 C104 264 136 264 150 254 L136 300 L104 300 Z" }, clip: "torso", anchor: [120, 274] },
  { key: "hip", sided: true, shape: { kind: "ellipse", cx: 80, cy: 262, rx: 18, ry: 28 }, clip: "body", anchor: [83, 262] },
  { key: "shoulder", sided: true, shape: { kind: "ellipse", cx: 73, cy: 110, rx: 20, ry: 24 }, clip: "body", anchor: [73, 112] },
  { key: "neck", sided: false, shape: { kind: "rect", x: 96, y: 56, w: 48, h: 36 }, clip: "neck", anchor: [120, 80] },
  { key: "head", sided: false, shape: HEAD, anchor: [120, 30] },
];

const BACK: Piece[] = [
  ...ARM_PIECES,
  { key: "thigh_back", sided: true, shape: { kind: "rect", x: 40, y: 240, w: 90, h: 132 }, clip: "legs", anchor: [95, 330] },
  { key: "calf", sided: true, shape: { kind: "rect", x: 40, y: 372, w: 90, h: 70 }, clip: "legs", anchor: [95, 410] },
  { key: "knee_back", sided: true, shape: { kind: "ellipse", cx: 94, cy: 374, rx: 24, ry: 17 }, clip: "legs", anchor: [94, 374] },
  { key: "heel", sided: true, shape: FOOT, anchor: [95, 453] },
  { key: "upper_back", sided: false, shape: { kind: "rect", x: 40, y: 76, w: 160, h: 122 }, clip: "torso", anchor: [120, 176] },
  { key: "lower_back", sided: false, shape: { kind: "rect", x: 40, y: 198, w: 160, h: 50 }, clip: "torso", anchor: [120, 222] },
  { key: "buttock", sided: true, shape: { kind: "ellipse", cx: 98, cy: 270, rx: 22, ry: 26 }, clip: "body", anchor: [99, 268] },
  { key: "shoulder_blade", sided: true, shape: { kind: "ellipse", cx: 97, cy: 128, rx: 19, ry: 25 }, clip: "torso", anchor: [97, 128] },
  { key: "neck_back", sided: false, shape: { kind: "rect", x: 96, y: 56, w: 48, h: 36 }, clip: "neck", anchor: [120, 80] },
  { key: "head_back", sided: false, shape: HEAD, anchor: [120, 36] },
];

const PIECES: Record<BodyView, Piece[]> = { front: FRONT, back: BACK };

function ShapeEl({ shape, ...rest }: { shape: Shape } & React.SVGProps<SVGPathElement & SVGEllipseElement & SVGRectElement>) {
  if (shape.kind === "path") return <path d={shape.d} {...rest} />;
  if (shape.kind === "ellipse") return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...rest} />;
  return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} {...rest} />;
}

/** Every silhouette shape, with sided ones drawn on both sides. */
function Silhouette(props: React.SVGProps<SVGPathElement & SVGEllipseElement & SVGRectElement>) {
  return (
    <>
      {CLIP_SHAPES.body.map(({ shape, both }, i) => (
        <g key={i}>
          <ShapeEl shape={shape} {...props} />
          {both ? <ShapeEl shape={shape} transform={MIRROR} {...props} /> : null}
        </g>
      ))}
    </>
  );
}

/** Spot size in viewBox units, and how close a tap must be to an existing spot to remove it. */
const SPOT_R = 24;
const HIT_R = 13;

/** The viewBox point under a mouse or touch tap. */
function svgPoint(e: MouseEvent<SVGElement>): [number, number] | null {
  const svg = e.currentTarget.ownerSVGElement;
  const m = svg?.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}

/** Side words for a view, as [viewer's left, viewer's right]. */
function sideLabels(lang: Lang, view: BodyView): [string, string] {
  const t = DIAGRAM_TEXT[lang];
  return view === "front" ? [t.right, t.left] : [t.left, t.right];
}

/** What makes a figure tappable; without it the figure is a read-only picture. */
type Interactive = {
  allowed: Set<RegionId>;
  /** A tap at a viewBox point, or a key press on a part (`point` is then the part's centre). */
  onTap: (partId: string, point: [number, number], byKey: boolean) => void;
};

/* ---------- One view ---------- */

function Figure({
  view,
  lang,
  spots,
  interactive,
}: {
  view: BodyView;
  lang: Lang;
  spots: BodySpot[];
  interactive?: Interactive;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = (c: ClipName) => `${uid}-${view}-${c}`;
  const spotFill = `${uid}-${view}-spot`;
  // Front: the viewer's left is the patient's right. Back: the viewer's left is the patient's left.
  const nearSide = view === "front" ? "right" : "left";
  const farSide = view === "front" ? "left" : "right";

  const drawn = interactive
    ? PIECES[view].flatMap((p) =>
        p.sided
          ? [
              { piece: p, id: `${nearSide}_${p.key}`, mirrored: false },
              { piece: p, id: `${farSide}_${p.key}`, mirrored: true },
            ]
          : [{ piece: p, id: p.key, mirrored: false }],
      )
    : [];

  const marked = new Set(spots.map((s) => s.partId));

  return (
    <svg
      viewBox={`0 0 ${W} 480`}
      className="block h-full w-full touch-manipulation select-none"
      role={interactive ? "group" : "img"}
      aria-label={DIAGRAM_TEXT[lang][view]}
    >
      <defs>
        {(Object.keys(CLIP_SHAPES) as ClipName[]).map((c) => (
          <clipPath key={c} id={clipId(c)}>
            {/* clipPath only accepts shapes directly (a <g> child clips everything away). */}
            {CLIP_SHAPES[c].flatMap(({ shape, both }, i) => [
              <ShapeEl key={`${i}a`} shape={shape} />,
              ...(both ? [<ShapeEl key={`${i}b`} shape={shape} transform={MIRROR} />] : []),
            ])}
          </clipPath>
        ))}
        {/* A soft spot: solid red at the touch point, fading out to nothing. */}
        <radialGradient id={spotFill}>
          <stop offset="0" style={{ stopColor: "var(--alert)", stopOpacity: 0.95 }} />
          <stop offset="0.35" style={{ stopColor: "var(--alert)", stopOpacity: 0.6 }} />
          <stop offset="0.7" style={{ stopColor: "var(--alert)", stopOpacity: 0.2 }} />
          <stop offset="1" style={{ stopColor: "var(--alert)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {/* Union outline: a thick stroke under a stroke-less fill leaves only the outer edge. */}
      <g aria-hidden="true" className="fill-surface stroke-ink" strokeWidth={5} strokeLinejoin="round">
        <Silhouette />
      </g>
      <g aria-hidden="true" className="fill-surface">
        <Silhouette />
      </g>

      {/* Invisible parts: they catch the tap and name it. Keyboard focus shows the part's outline. */}
      {drawn.map(({ piece, id, mirrored }) => {
        const part = getBodyPart(id);
        if (!part || !interactive) return null;
        const { allowed, onTap } = interactive;
        const enabled = allowed.has(part.region);
        const point: [number, number] = [mirrored ? W - piece.anchor[0] : piece.anchor[0], piece.anchor[1]];
        return (
          <g key={`${id}-${piece.key}`} clipPath={piece.clip ? `url(#${clipId(piece.clip)})` : undefined}>
            <ShapeEl
              shape={piece.shape}
              transform={mirrored ? MIRROR : undefined}
              role="checkbox"
              aria-checked={marked.has(id)}
              aria-disabled={!enabled || undefined}
              aria-label={part.text[lang]}
              tabIndex={enabled ? 0 : -1}
              onClick={
                enabled
                  ? (e) => {
                      const p = svgPoint(e);
                      if (p) onTap(id, p, false);
                    }
                  : undefined
              }
              onKeyDown={
                enabled
                  ? (e: KeyboardEvent) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      onTap(id, point, true);
                    }
                  : undefined
              }
              strokeWidth={2}
              className={`stroke-transparent outline-none ${
                enabled ? "cursor-crosshair fill-transparent focus-visible:fill-blue-soft/60" : "fill-ground-2"
              } focus-visible:stroke-blue-deep focus-visible:[stroke-width:4]`}
            />
          </g>
        );
      })}

      {/* Face (front) and spine (back) as quiet orientation cues; they never take a tap. */}
      {view === "front" ? (
        <g aria-hidden="true" className="pointer-events-none fill-none stroke-ink-soft" strokeWidth={2} strokeLinecap="round">
          <circle cx={111} cy={38} r={2.4} className="fill-ink-soft" />
          <circle cx={129} cy={38} r={2.4} className="fill-ink-soft" />
          <path d="M113 53 Q120 57 127 53" />
        </g>
      ) : (
        <path aria-hidden="true" d="M120 96 V246" strokeWidth={1.5} strokeDasharray="2 6" strokeLinecap="round" className="pointer-events-none fill-none stroke-line" />
      )}

      {/* The spots, kept inside the body outline. A dark centre dot marks each without relying on colour. */}
      <g aria-hidden="true" className="pointer-events-none" clipPath={`url(#${clipId("body")})`}>
        {spots.map((s) => (
          <g key={s.id} transform={`translate(${s.x} ${s.y})`}>
            <g className="body-mark">
              <circle r={SPOT_R} fill={`url(#${spotFill})`} />
              <circle r={2.6} className="fill-alert-deep" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ---------- The diagram ---------- */

export function BodyDiagram({ regions, onSelect, lang, spots, onSpotsChange }: BodyDiagramFullProps) {
  const t = DIAGRAM_TEXT[lang];
  const [view, setView] = useState<BodyView>("front");
  const allowed = new Set(regions);

  function tap(v: BodyView, partId: string, [x, y]: [number, number], byKey: boolean) {
    const part = getBodyPart(partId);
    if (!part) return;
    // Tapping on a spot removes it; a key press on a part that has spots clears that part.
    const hit = byKey
      ? spots.filter((s) => s.view === v && s.partId === partId)
      : spots.filter((s) => s.view === v && Math.hypot(s.x - x, s.y - y) < HIT_R).slice(0, 1);
    if (hit.length) return onSpotsChange(spots.filter((s) => !hit.includes(s)));
    const spot: BodySpot = { id: `${v}:${x.toFixed(1)}:${y.toFixed(1)}`, view: v, x, y, partId };
    onSpotsChange([...spots, spot], spot);
    onSelect(part.region, "tap");
  }

  const countOn = (v: BodyView) => spots.filter((s) => s.view === v).length;
  const parts = spotParts(spots);
  const perPart = new Map<string, number>();
  for (const s of spots) perPart.set(s.partId, (perPart.get(s.partId) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg leading-snug text-ink-soft">{t.hint}</p>

      {/* Front / back switch on phones; both views sit side by side from md. */}
      <div role="tablist" aria-label={`${t.front} / ${t.back}`} className="relative grid grid-cols-2 rounded-full bg-ground-2 p-1 md:hidden">
        <span
          aria-hidden="true"
          className={`absolute inset-y-1 start-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-soft transition-transform duration-500 ease-[var(--spring-pop)] motion-reduce:transition-none ${
            view === "back" ? "translate-x-full rtl:-translate-x-full" : ""
          }`}
        />
        {(["front", "back"] as const).map((v) => {
          const n = countOn(v);
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`relative z-10 flex min-h-12 items-center justify-center gap-2 rounded-full text-lg ${
                view === v ? "font-bold text-ink" : "font-medium text-ink-soft"
              }`}
            >
              {t[v]}
              {n ? (
                <span className="grid size-6 place-items-center rounded-full bg-alert text-sm font-bold text-white tabular-nums">{n}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(["front", "back"] as const).map((v) => {
          const [startLabel, endLabel] = sideLabels(lang, v);
          return (
            <figure
              key={v}
              dir="ltr"
              className={`relative rounded-sheet bg-ground-2 px-2 pb-2 pt-9 md:pt-12 ${v === view ? "" : "hidden md:block"}`}
            >
              <figcaption className="absolute inset-x-0 top-3 hidden text-center text-base font-semibold text-ink md:block">{t[v]}</figcaption>
              <span className="absolute start-4 top-3 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-ink-soft ring-1 ring-line">{startLabel}</span>
              <span className="absolute end-4 top-3 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-ink-soft ring-1 ring-line">{endLabel}</span>
              <div className="mx-auto h-[min(46svh,32rem)] min-h-72 w-full">
                <Figure
                  view={v}
                  lang={lang}
                  spots={spots.filter((s) => s.view === v)}
                  interactive={{ allowed, onTap: (id, p, byKey) => tap(v, id, p, byKey) }}
                />
              </div>
            </figure>
          );
        })}
      </div>

      {/* What has been chosen, one chip per part, removable; also the readable list for screen readers. */}
      <div aria-live="polite" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-blue-deeper">{t.chosen}</h3>
        {parts.length ? (
          <ul className="flex flex-wrap gap-2">
            {parts.map((id) => {
              const part = getBodyPart(id);
              if (!part) return null;
              const n = perPart.get(id) ?? 0;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSpotsChange(spots.filter((s) => s.partId !== id))}
                    aria-label={t.remove(part.text[lang])}
                    className="press flex min-h-12 items-center gap-2 rounded-full bg-blue-deep py-2 pe-3 ps-5 text-lg font-semibold text-white shadow-soft hover:bg-blue-deeper"
                  >
                    {part.text[lang]}
                    {n > 1 ? <span className="tabular-nums opacity-80">×{n}</span> : null}
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 rounded-full bg-white/15 p-1" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                      <path d="M7 7l10 10M17 7L7 17" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-base text-ink-soft">{t.none}</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Read-only map for the clinician ---------- */

/** Front and back side by side with every spot the patient placed. Labels are English (clinician side). */
// Memoised: it sits in every conversation bubble, which re-renders on each keystroke of the composer.
export const BodyMap = memo(function BodyMap({ spots, className = "" }: { spots: BodySpot[]; className?: string }) {
  const t = DIAGRAM_TEXT.en;
  const parts = spotLabels(spots);
  return (
    <div dir="ltr" lang="en" className={`grid grid-cols-2 gap-2 ${className}`} role="group" aria-label={`Where it hurts: ${parts || "nothing marked"}`}>
      {(["front", "back"] as const).map((v) => {
        const [startLabel, endLabel] = sideLabels("en", v).map((w) => w[0]);
        return (
          <figure key={v} className="relative m-0 rounded-sheet bg-ground-2 px-1 pb-1 pt-7">
            <figcaption className="absolute inset-x-0 top-1.5 text-center text-xs font-semibold text-ink">{t[v]}</figcaption>
            <span aria-hidden="true" className="absolute start-2 top-1.5 text-xs font-semibold text-ink-soft">{startLabel}</span>
            <span aria-hidden="true" className="absolute end-2 top-1.5 text-xs font-semibold text-ink-soft">{endLabel}</span>
            <div className="mx-auto aspect-[1/2] w-full">
              <Figure view={v} lang="en" spots={spots.filter((s) => s.view === v)} />
            </div>
          </figure>
        );
      })}
    </div>
  );
});
