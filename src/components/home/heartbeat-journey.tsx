"use client";

import { useEffect, useRef } from "react";
import { clamp, ease, heartbeat, journeyPoint, mix, monitorPoint, type Stage } from "./heartbeat-geometry";

/** Scroll-driven snake climb, followed by a compact reading-progress heartbeat. */
export function HeartbeatJourney() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const slot = document.querySelector<HTMLElement>("[data-emblem-slot]");
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    if (!canvas || !ctx || !slot || !header) return;
    const css = getComputedStyle(document.documentElement);
    const blue = css.getPropertyValue("--blue").trim();
    const dark = css.getPropertyValue("--blue-deep").trim();
    const white = css.getPropertyValue("--ground").trim();
    const mist = css.getPropertyValue("--blue-soft").trim();
    const navy = css.getPropertyValue("--navy").trim();
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = !document.hidden;
    let mounted = true;
    let lastPaint = "";
    let live = true;
    let origin = { x: 0, top: 0, height: 0, radius: 0 };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = innerWidth;
      height = innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = slot!.getBoundingClientRect();
      const copy = document.querySelector<HTMLElement>("[data-emblem-copy]")?.getBoundingClientRect();
      const phone = document.querySelector<HTMLElement>("[data-phone-rail] figure")?.getBoundingClientRect();
      const staffHeight = clamp((phone?.height || height * 0.7) * 0.58, 290, 400);
      const copyCenter = copy ? copy.top + scrollY + copy.height / 2 : height / 2;
      const phoneCenter = phone ? phone.top + phone.height / 2 : height / 2;
      const gap = phone && copy ? phone.left - copy.right : 176;
      origin = {
        x: phone && copy ? (copy.right + phone.left) / 2 : r.left + r.width / 2,
        top: (copyCenter + phoneCenter) / 2 - staffHeight / 2,
        height: staffHeight,
        radius: clamp(gap * 0.18, 23, 36),
      };
      lastPaint = "";
      requestPaint();
    }
    resize();

    const line = (points: { x: number; y: number }[], stroke: string | CanvasGradient, thickness: number, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    function draw(time: number) {
      const reducedMotion = motion.matches;
      const pulse = live && !reducedMotion;
      const maxScroll = document.documentElement.scrollHeight - innerHeight;
      const progress = maxScroll > 0 ? clamp(scrollY / maxScroll) : 0;
      const launchDistance = innerHeight * 0.48;
      const travel = clamp(scrollY / launchDistance);
      const phase = reducedMotion ? (travel > 0.02 ? 1 : 0) : travel;
      const rect = slot!.getBoundingClientRect();
      const dockY = header!.getBoundingClientRect().bottom - 1;
      const hasEmblem = rect.width > 8 && rect.height > 8;
      // The monitor begins exactly where the snake arrives. Progress only continues clockwise.
      const entryX = hasEmblem ? origin.x : width * 0.72;
      const startX = 16;
      const pathLength = width - 12 - 18 - startX + Math.PI * 18 / 2 + Math.max(0, height - 24 - dockY - 18);
      const entryProgress = clamp((entryX - startX) / pathLength);
      const readingProgress = hasEmblem ? clamp((scrollY - launchDistance) / Math.max(1, maxScroll - launchDistance)) : progress;
      const monitorProgress = mix(entryProgress, 1, readingProgress);
      const stage: Stage = { ...origin, dockX: origin.x, dockY };
      const docked = hasEmblem ? ease(0.86, 1, phase) : ease(0.01, 0.15, phase);
      const stamp = [phase, progress, stage.x, stage.top, width, height, pulse && !reducedMotion && phase > 0.65 ? Math.round(time / 40) : 0].join(":");
      if (stamp === lastPaint) return;
      lastPaint = stamp;
      ctx!.clearRect(0, 0, width, height);

      if (hasEmblem && phase < 1) {
        // Resample by physical length. Parameter-space interpolation would stretch the body
        // hundreds of pixels when it reached the horizontal part of the route.
        const route = Array.from({ length: 650 }, (_, i) => journeyPoint(i / 649 * 2.15, stage));
        const lengths = [0];
        for (let i = 1; i < route.length; i++) lengths.push(lengths[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y));
        const start = lengths[Math.round(0.84 / 2.15 * 649)];
        const originalLength = start - lengths[Math.round(0.06 / 2.15 * 649)];
        const bodyLength = originalLength * mix(1, 0.15, ease(0.16, 0.75, phase));
        const headDistance = mix(start, lengths[649] + originalLength * 0.15, phase);
        const pointAt = (distance: number) => {
          let lo = 0;
          let hi = 649;
          while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (lengths[mid] < distance) lo = mid + 1; else hi = mid;
          }
          const i = Math.max(1, lo);
          const t = clamp((distance - lengths[i - 1]) / Math.max(0.0001, lengths[i] - lengths[i - 1]));
          return { x: mix(route[i - 1].x, route[i].x, t), y: mix(route[i - 1].y, route[i].y, t), z: mix(route[i - 1].z, route[i].z, t) };
        };
        const points = Array.from({ length: 200 }, (_, i) => {
          const body = i / 199;
          return { ...pointAt(headDistance - body * bodyLength), body };
        });
        const bodyAlpha = 1 - ease(0.87, 1, phase);
        const renderBody = (front: boolean) => {
          for (let i = points.length - 1; i > 0; i--) {
            const p = points[i];
            if ((p.z >= 0) !== front) continue;
            const thickness = mix(2, 13, Math.sin((1 - p.body) * Math.PI / 2)) * mix(1, 0.18, docked);
            line([p, points[i - 1]], front ? blue : dark, thickness, bodyAlpha);
            if (front) {
              const next = points[i - 1];
              const length = Math.hypot(next.x - p.x, next.y - p.y) || 1;
              const nx = -(next.y - p.y) / length;
              const ny = (next.x - p.x) / length;
              const offset = thickness * 0.2;
              const highlight = [{ x: p.x + nx * offset, y: p.y + ny * offset }, { x: next.x + nx * offset, y: next.y + ny * offset }];
              line(highlight, mist, thickness * 0.2, bodyAlpha * 0.42 * (1 - docked));
            }
          }
        };

        renderBody(false);
        // The staff stays upright. It disappears only after the snake has cleared it.
        const poleAlpha = 1 - ease(0.45, 0.72, phase);
        // A slender, softly capped staff, scaled to its neighbouring phone rather than the page.
        ctx!.save();
        ctx!.globalAlpha = poleAlpha;
        const staffFinish = ctx!.createLinearGradient(stage.x - 5, 0, stage.x + 5, 0);
        staffFinish.addColorStop(0, blue);
        staffFinish.addColorStop(0.3, mist);
        staffFinish.addColorStop(0.52, white);
        staffFinish.addColorStop(1, blue);
        ctx!.fillStyle = staffFinish;
        ctx!.beginPath();
        ctx!.roundRect(stage.x - 5, stage.top - 12, 10, stage.height + 26, 5);
        ctx!.fill();
        line([{ x: stage.x - 1.6, y: stage.top - 6 }, { x: stage.x - 1.6, y: stage.top + stage.height + 7 }], white, 1.1, poleAlpha * 0.55);
        ctx!.restore();
        renderBody(true);

        const head = points[0];
        const neck = pointAt(headDistance - 3);
        ctx!.save();
        ctx!.translate(head.x, head.y);
        ctx!.rotate(Math.atan2(head.y - neck.y, head.x - neck.x));
        ctx!.globalAlpha = 1 - docked;
        ctx!.fillStyle = blue;
        ctx!.beginPath();
        ctx!.ellipse(2, 0, 11, 7, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = mist;
        ctx!.lineWidth = 1;
        ctx!.globalAlpha = (1 - docked) * 0.45;
        ctx!.beginPath();
        ctx!.ellipse(1, -1, 7, 3.5, 0, Math.PI * 1.1, Math.PI * 1.8);
        ctx!.stroke();
        ctx!.globalAlpha = 1 - docked;
        ctx!.fillStyle = navy;
        ctx!.beginPath();
        ctx!.arc(6, -2.6, 1.2, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();

      }

      if (docked > 0) {
        const route = (p: number) => monitorPoint(p, startX, dockY, width, height);
        const track = Array.from({ length: 180 }, (_, i) => route(i / 179));
        const trailEnd = Math.max(0, monitorProgress - 22 / pathLength);
        // The tail unfurls backwards from the arriving snake, with a feathered origin.
        // It reads as the same signal gaining history, not a bar appearing from nowhere.
        const trailStart = mix(trailEnd, 0, ease(0.84, 1, phase));
        const travelled = Array.from({ length: 180 }, (_, i) => route(mix(trailStart, trailEnd, i / 179)));
        // A dark under-stroke keeps the quiet blue trace legible over both the white and navy bands.
        line(track, navy, 3, docked * 0.2);
        line(track, blue, 1, docked * 0.38);
        const tail = route(trailStart);
        const tip = route(trailEnd);
        const fade = ctx!.createLinearGradient(tail.x, tail.y, tip.x + 0.01, tip.y + 0.01);
        fade.addColorStop(0, "transparent");
        fade.addColorStop(0.3, blue);
        fade.addColorStop(1, blue);
        line(travelled, fade, 2, docked * 0.9);
        const wave = Array.from({ length: 81 }, (_, i) => {
          const u = i / 40 - 1;
          const point = route(monitorProgress + u * 22 / pathLength);
          // A live ECG sweep inside a fixed reading-position window, rather than a scaling icon.
          const sweep = pulse ? ((u + time / 650) % 2 + 2) % 2 - 1 : u;
          const envelope = pulse ? Math.sin(Math.PI * (u + 1) / 2) : 1;
          const amplitude = heartbeat(sweep) * 9 * envelope;
          return { x: point.x + point.nx * amplitude, y: point.y + point.ny * amplitude };
        });
        line(wave, navy, 4.5, docked * 0.35);
        line(wave, blue, 2.5, docked);
      }
    }

    function requestPaint() {
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }
    function frame(time: number) {
      raf = 0;
      draw(time);
      if (live && !motion.matches && scrollY > innerHeight * 0.4128) requestPaint();
    }
    function visibility() {
      visible = !document.hidden;
      cancelAnimationFrame(raf);
      raf = 0;
      if (visible) requestPaint();
    }
    function scroll() {
      requestPaint();
    }
    function playback(event: Event) {
      live = (event as CustomEvent<boolean>).detail;
      lastPaint = "";
      requestPaint();
    }
    void document.fonts.ready.then(() => { if (mounted) resize(); });
    requestPaint();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", requestPaint);
    window.addEventListener("synapse:demo-playing", playback);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", requestPaint);
      window.removeEventListener("synapse:demo-playing", playback);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] h-dvh w-full" />;
}
