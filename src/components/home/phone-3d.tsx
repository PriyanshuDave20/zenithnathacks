"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ASPECT,
  BODY_W,
  DESIGN_H,
  DESIGN_W,
  GLASS_RADIUS,
  PAD_X,
  PAD_Y,
  REST_YAW,
  createRig,
  facing,
  flatGlassTransform,
  glassTransform,
} from "./phone-rig";

/** Width of a standalone phone: never wider than its column, never taller than ~70% of the screen. */
export const PHONE_WIDTH = "w-[min(20.5rem,100%,calc(70svh*0.48))]";

/** Status strip at the top of every phone screen. */
export function StatusStrip() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between px-7 text-sm font-semibold text-ink">
      <span>9:41</span>
      <span aria-hidden="true" className="h-6 w-24 rounded-full bg-navy" />
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="h-2.5 w-4 rounded-[3px] border-2 border-ink" />
      </span>
    </div>
  );
}

/** Glass geometry shared by the inline and the travelling phone (inline styles: layout-critical). */
export const glassStyle = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: `${DESIGN_W}px`,
  height: `${DESIGN_H}px`,
  marginLeft: `${-DESIGN_W / 2}px`,
  marginTop: `${-DESIGN_H / 2}px`,
  borderRadius: `${GLASS_RADIUS}px`,
} as const;

export const canvasHostStyle = {
  width: `${100 * (1 + PAD_X)}%`,
  height: `${100 * (1 + PAD_Y)}%`,
} as const;

/**
 * A 3D phone in the page flow. It faces the screen at a slight resting angle, leans a little toward
 * a cursor or touch and settles when that stops, and swings toward the new holder when `swing`
 * changes. It never moves with scroll by script: wherever it sits (in flow or CSS sticky), the
 * browser positions it, so it cannot lag. Before the model loads, or without WebGL, a CSS bezel
 * stands in.
 */
export function Phone3D({
  children,
  label,
  className = PHONE_WIDTH,
  swing = 0,
  swingDir = 1,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  /** Change this to swing the phone toward whoever holds it now. */
  swing?: number;
  swingDir?: 1 | -1;
}) {
  const figure = useRef<HTMLElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [sized, setSized] = useState(false);
  const swingRef = useRef({ key: swing, dir: swingDir });

  useEffect(() => {
    swingRef.current = { key: swing, dir: swingDir };
  }, [swing, swingDir]);

  useEffect(() => {
    const fig = figure.current;
    const host = canvasHost.current;
    const gl = glass.current;
    if (!fig || !host || !gl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stop: (() => void) | null = null;
    let starting = false;
    let cancelled = false;
    let live = false;

    // Flat fallback: scale the design-size screen onto the CSS bezel until (or unless) WebGL runs.
    const fit = () => {
      if (!live) gl.style.transform = flatGlassTransform(fig.clientWidth / BODY_W);
    };
    fit();
    setSized(true);
    const fitObserver = new ResizeObserver(fit);
    fitObserver.observe(fig);

    // A WebGL context only while the phone is near the screen: a page can hold several phones.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !stop && !starting) {
          starting = true;
          start()
            .then((s) => {
              if (cancelled) s?.();
              else stop = s;
            })
            .finally(() => {
              starting = false;
            });
        } else if (!entry.isIntersecting && stop) {
          stop();
          stop = null;
          setReady(false);
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(fig);

    async function start(): Promise<(() => void) | null> {
      let rig;
      try {
        rig = await createRig();
      } catch {
        return null; // the CSS bezel stays
      }
      if (cancelled) {
        rig.dispose();
        return null;
      }
      live = true;
      host!.appendChild(rig.canvas);
      let k = rig.setWidth(fig!.clientWidth);
      const ro = new ResizeObserver(() => {
        k = rig.setWidth(fig!.clientWidth);
      });
      ro.observe(fig!);

      let yaw = REST_YAW;
      let pitch = 0;
      let leanYaw = 0;
      let leanPitch = 0;
      let leanAt = -1e9;
      const onMove = (e: PointerEvent) => {
        const r = fig!.getBoundingClientRect();
        leanYaw = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))) * 0.18;
        leanPitch = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2))) * 0.06;
        leanAt = performance.now();
      };
      if (!reduced) window.addEventListener("pointermove", onMove, { passive: true });

      // The swing: a critically damped spring, kicked when the holder changes.
      let swingAngle = 0;
      let swingVel = 0;
      let seenSwing = swingRef.current.key;

      let last = performance.now();
      const draw = (t: number) => {
        const dt = Math.min(Math.max((t - last) / 1000, 0), 0.05);
        last = t;
        let aimYaw = REST_YAW;
        let aimPitch = 0;
        if (!reduced) {
          const leaning = t - leanAt < 1800 ? 1 : 0; // a lifted finger or a still cursor lets it settle
          aimYaw += leanYaw * leaning;
          aimPitch += leanPitch * leaning;
          const sw = swingRef.current;
          if (sw.key !== seenSwing) {
            seenSwing = sw.key;
            swingVel += sw.dir * 6;
          }
          const K = 70;
          swingVel += (-K * swingAngle - 2 * Math.sqrt(K) * swingVel) * dt;
          swingAngle += swingVel * dt;
        }
        const ease = reduced ? 1 : 1 - Math.exp(-dt * 5);
        yaw += (aimYaw - yaw) * ease;
        pitch += (aimPitch - pitch) * ease;
        const y = yaw + swingAngle;
        rig.render(y, pitch);
        gl!.style.visibility = facing(y) ? "" : "hidden";
        gl!.style.transform = glassTransform(k, y, pitch);
      };
      draw(last);
      setReady(true);
      let raf = 0;
      if (!reduced) {
        const loop = (t: number) => {
          draw(t);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        rig.dispose();
        live = false;
        gl!.style.visibility = "";
        fit();
      };
    }

    return () => {
      cancelled = true;
      io.disconnect();
      fitObserver.disconnect();
      stop?.();
    };
  }, []);

  return (
    <figure ref={figure} aria-label={label} className={`relative mx-auto ${className}`} style={{ aspectRatio: ASPECT }}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 rounded-[13%/6.3%] bg-navy-raised shadow-device transition-opacity duration-500 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-x-[10%] -bottom-2 h-6 rounded-[50%] bg-[rgb(5_10_20/0.3)] blur-2xl transition-opacity duration-500 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={canvasHost}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={canvasHostStyle}
      />
      <div
        ref={glass}
        className={`flex flex-col overflow-hidden bg-ground transition-opacity duration-300 ${sized ? "" : "opacity-0"}`}
        style={glassStyle}
      >
        <StatusStrip />
        {children}
      </div>
    </figure>
  );
}
