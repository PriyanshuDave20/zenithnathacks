"use client";

// Tappable body diagram for "Where does it hurt?" (Backend 2 input channel, tap first; gaze builds on it).
// Front and back views; the patient taps one or more parts. Emits the contract's RegionId through
// `onSelect` and the finer part id through `onToggle`. Anatomy is never mirrored for right-to-left
// languages: the patient's right is always on the viewer's left in the front view.
import { useId, useState, type KeyboardEvent } from "react";
import type { BodyDiagramProps, RegionId } from "@/lib/contracts/input";
import { BODY_PARTS, DIAGRAM_TEXT, getBodyPart, type BodyView } from "@/lib/input/body-parts";

type Lang = keyof typeof DIAGRAM_TEXT;

export type BodyDiagramFullProps = BodyDiagramProps & {
  lang: Lang;
  /** Selected part ids, e.g. ["right_knee", "lower_back"]. */
  selected: string[];
  /** Called with the part id on every tap; the parent adds or removes it. */
  onToggle: (partId: string, nowSelected: boolean) => void;
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

/** A tappable piece. `key` is the part id, or the sided key (e.g. "knee") when `sided`. */
type Piece = { key: string; sided: boolean; shape: Shape; clip?: ClipName; anchor: [number, number] };

// Shared limb pieces; draw order matters, later pieces sit on top and draw the divider lines.
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

/* ---------- One view ---------- */

function Figure({
  view,
  lang,
  selected,
  allowed,
  onPress,
}: {
  view: BodyView;
  lang: Lang;
  selected: Set<string>;
  allowed: Set<RegionId>;
  onPress: (partId: string) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = (c: ClipName) => `${uid}-${view}-${c}`;
  // Front: the viewer's left is the patient's right. Back: the viewer's left is the patient's left.
  const nearSide = view === "front" ? "right" : "left";
  const farSide = view === "front" ? "left" : "right";

  const drawn = PIECES[view].flatMap((p) =>
    p.sided
      ? [
          { piece: p, id: `${nearSide}_${p.key}`, mirrored: false },
          { piece: p, id: `${farSide}_${p.key}`, mirrored: true },
        ]
      : [{ piece: p, id: p.key, mirrored: false }],
  );

  function onKey(e: KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPress(id);
    }
  }

  return (
    <svg viewBox={`0 0 ${W} 480`} className="block h-full w-full touch-manipulation select-none" role="group" aria-label={DIAGRAM_TEXT[lang][view]}>
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
      </defs>

      {/* Union outline: a thick stroke under a stroke-less fill leaves only the outer edge. */}
      <g aria-hidden="true" className="fill-surface stroke-ink" strokeWidth={5} strokeLinejoin="round">
        <Silhouette />
      </g>
      <g aria-hidden="true" className="fill-surface">
        <Silhouette />
      </g>

      {drawn.map(({ piece, id, mirrored }) => {
        const part = getBodyPart(id);
        if (!part) return null;
        const enabled = allowed.has(part.region);
        const on = selected.has(id);
        return (
          <g key={`${id}-${piece.key}`} clipPath={piece.clip ? `url(#${clipId(piece.clip)})` : undefined}>
            <ShapeEl
              shape={piece.shape}
              transform={mirrored ? MIRROR : undefined}
              role="checkbox"
              aria-checked={on}
              aria-disabled={!enabled || undefined}
              aria-label={part.text[lang]}
              tabIndex={enabled ? 0 : -1}
              onClick={enabled ? () => onPress(id) : undefined}
              onKeyDown={enabled ? (e) => onKey(e, id) : undefined}
              strokeWidth={2}
              className={`stroke-ink-soft/45 outline-none transition-[fill] duration-150 ${
                !enabled
                  ? "fill-ground-2"
                  : on
                    ? "cursor-pointer fill-blue-deep stroke-blue-deeper"
                    : "cursor-pointer fill-surface hover:fill-blue-soft focus-visible:fill-blue-soft"
              } focus-visible:stroke-blue-deep focus-visible:[stroke-width:6]`}
            />
          </g>
        );
      })}

      {/* Face (front) as quiet orientation cues; they never take a tap. */}
      {view === "front" ? (
        <g aria-hidden="true" className="pointer-events-none fill-none stroke-ink-soft" strokeWidth={2} strokeLinecap="round">
          <circle cx={111} cy={38} r={2.4} className={selected.has("head") ? "fill-white stroke-white" : "fill-ink-soft"} />
          <circle cx={129} cy={38} r={2.4} className={selected.has("head") ? "fill-white stroke-white" : "fill-ink-soft"} />
          <path d="M113 53 Q120 57 127 53" className={selected.has("head") ? "stroke-white" : undefined} />
        </g>
      ) : (
        <path
          aria-hidden="true"
          d="M120 96 V246"
          strokeWidth={1.5}
          strokeDasharray="2 6"
          strokeLinecap="round"
          className={`pointer-events-none fill-none ${selected.has("upper_back") || selected.has("lower_back") ? "stroke-white/70" : "stroke-line"}`}
        />
      )}

      {/* Selected marks: a check disc on each chosen part, so selection reads without colour. */}
      {drawn
        .filter(({ id }) => selected.has(id))
        .map(({ piece, id, mirrored }) => {
          const [x, y] = piece.anchor;
          const cx = mirrored ? W - x : x;
          return (
            <g key={`mark-${id}`} transform={`translate(${cx} ${y})`} aria-hidden="true" className="pointer-events-none">
              <g className="body-mark">
                <circle r={9.5} className="fill-surface" />
                <path d="M-4.2 0.2 L-1.3 3.2 L4.4 -3.4" className="fill-none stroke-blue-deep" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          );
        })}
    </svg>
  );
}

/* ---------- The diagram ---------- */

export function BodyDiagram({ regions, onSelect, lang, selected, onToggle }: BodyDiagramFullProps) {
  const t = DIAGRAM_TEXT[lang];
  const [view, setView] = useState<BodyView>("front");
  const chosen = new Set(selected);
  const allowed = new Set(regions);

  function press(partId: string) {
    const part = getBodyPart(partId);
    if (!part) return;
    const now = !chosen.has(partId);
    onToggle(partId, now);
    if (now) onSelect(part.region, "tap");
  }

  const countOn = (v: BodyView) => selected.filter((id) => BODY_PARTS.some((p) => p.id === id && p.view === v)).length;
  const sideLabels = (v: BodyView) => (v === "front" ? [t.right, t.left] : [t.left, t.right]);

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
                <span className="grid size-6 place-items-center rounded-full bg-blue-deep text-sm font-bold text-white tabular-nums">{n}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(["front", "back"] as const).map((v) => {
          const [startLabel, endLabel] = sideLabels(v);
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
                <Figure view={v} lang={lang} selected={chosen} allowed={allowed} onPress={press} />
              </div>
            </figure>
          );
        })}
      </div>

      {/* What has been chosen, removable; also the readable list for screen readers. */}
      <div aria-live="polite" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-blue-deeper">{t.chosen}</h3>
        {selected.length ? (
          <ul className="flex flex-wrap gap-2">
            {selected.map((id) => {
              const part = getBodyPart(id);
              if (!part) return null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onToggle(id, false)}
                    aria-label={t.remove(part.text[lang])}
                    className="press flex min-h-12 items-center gap-2 rounded-full bg-blue-deep py-2 pe-3 ps-5 text-lg font-semibold text-white shadow-soft hover:bg-blue-deeper"
                  >
                    {part.text[lang]}
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
