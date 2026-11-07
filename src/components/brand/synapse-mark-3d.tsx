import { BLUE_MARK, WHITE_MARK } from "./synapse-logo";

/**
 * The Synapse "S" mark as a solid, extruded object (CSS 3D, no libraries).
 * The front face carries the true brand colours; stacked layers behind it form the side walls,
 * shaded darker toward the back. The whole object turns to face the visitor as the section scrolls
 * into view (scroll-driven animation); browsers without scroll timelines, or with reduced motion,
 * show it at rest, slightly angled so the depth still reads.
 */

const VIEWBOX = "502.6 174.9 305.9 355.7";
const DEPTH_LAYERS = 16;
const LAYER = { position: "absolute", inset: 0, width: "100%", height: "100%" } as const;

// Side-wall shades from the DESIGN.md tokens: the white half falls from On-Navy Mist to Slate Blue,
// the light-blue half from Synapse Light Blue to Deep Signal Blue, darker toward the back.
const whiteSide = (t: number) => `color-mix(in oklab, var(--color-on-navy-soft) ${92 - t * 70}%, var(--color-ink-soft))`;
const blueSide = (t: number) => `color-mix(in oklab, var(--color-blue) ${80 - t * 65}%, var(--color-blue-deeper))`;

export function SynapseMark3D({ className = "" }: { className?: string }) {
  return (
    // Layout-critical 3D styles are inline so the layers can never fan out into repeated copies,
    // even if the stylesheet is stale or missing. globals.css adds only the angle and scroll turn.
    <div className={`mark3d-stage ${className}`} role="img" aria-label="Synapse" style={{ perspective: "900px" }}>
      <div
        className="mark3d-object"
        aria-hidden="true"
        style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d" }}
      >
        {Array.from({ length: DEPTH_LAYERS }, (_, i) => {
          const t = (i + 1) / DEPTH_LAYERS;
          return (
            <svg
              key={i}
              viewBox={VIEWBOX}
              className="mark3d-layer"
              style={{ ...LAYER, transform: `translateZ(${-(i + 1) * 1.6}px)` }}
            >
              <path d={WHITE_MARK} fill={whiteSide(t)} />
              <path d={BLUE_MARK} fill={blueSide(t)} />
            </svg>
          );
        })}
        <svg viewBox={VIEWBOX} className="mark3d-layer mark3d-front" style={LAYER}>
          <path d={WHITE_MARK} fill="#ffffff" />
          <path d={BLUE_MARK} fill="var(--color-blue)" />
        </svg>
      </div>
    </div>
  );
}
