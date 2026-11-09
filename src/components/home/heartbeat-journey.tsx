"use client";

import { useEffect, useRef } from "react";
import { ROUTE, clamp, ease, heartbeat, journeyPoint, mix, monitorPoint, type Stage } from "./heartbeat-geometry";

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
    const rgb = (hex: string) => {
      const v = hex.replace("#", "");
      const n = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const tint = (a: string, b: string, t: number) => {
      const [r1, g1, b1] = rgb(a);
      const [r2, g2, b2] = rgb(b);
      return `rgb(${Math.round(mix(r1, r2, t))} ${Math.round(mix(g1, g2, t))} ${Math.round(mix(b1, b2, t))})`;
    };
    // The load sequence: the staff rises, the finial settles, then the snake slithers up from the foot.
    let t0 = -1;
    let introDone = scrollY > 40;
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
      // Tall enough to read as the page's emblem, but never taller than the room under the header.
      const staffHeight = Math.min(clamp((phone?.height || height * 0.7) * 0.9, 360, 600), Math.max(300, height - 64 - 190));
      const copyCenter = copy ? copy.top + scrollY + copy.height / 2 : height / 2;
      const phoneCenter = phone ? phone.top + phone.height / 2 : height / 2;
      const gap = phone && copy ? phone.left - copy.right : 176;
      origin = {
        x: phone && copy ? (copy.right + phone.left) / 2 : r.left + r.width / 2,
        top: (copyCenter + phoneCenter) / 2 - staffHeight / 2,
        height: staffHeight,
        // The coil, head and heartbeat rings are all capped by the measured gap, so the emblem
        // grows taller without ever reaching the copy or the pinned phone.
        radius: clamp(gap * 0.2, 26, 50),
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
      const launchDistance = innerHeight * 0.7;
      const travel = clamp(scrollY / launchDistance);
      const phase = reducedMotion ? (travel > 0.02 ? 1 : 0) : travel;
      const rect = slot!.getBoundingClientRect();
      const dockY = header!.getBoundingClientRect().bottom - 1;
      const hasEmblem = rect.width > 8 && rect.height > 8;
      // The monitor begins exactly where the snake arrives. Progress only continues clockwise.
      // On phones the monitor starts at the top left instead of under the centred emblem; desktop is unchanged.
      const compact = width < 768;
      const entryX = compact ? 16 : hasEmblem ? origin.x : width * 0.72;
      const startX = 16;
      const pathLength = width - 12 - 18 - startX + Math.PI * 18 / 2 + Math.max(0, height - 24 - dockY - 18);
      const entryProgress = clamp((entryX - startX) / pathLength);
      const readingProgress = hasEmblem ? clamp((scrollY - launchDistance) / Math.max(1, maxScroll - launchDistance)) : progress;
      const monitorProgress = mix(entryProgress, 1, readingProgress);
      const animating = live && !reducedMotion;
      if (t0 < 0) t0 = time;
      if (!animating) introDone = true;
      const introP = introDone ? 1 : clamp((time - t0 - 120) / 2100);
      if (introP >= 1) introDone = true;
      // Idle life fades out as the page scrolls; it only exists while the emblem stands alone in the hero.
      const idle = animating && introDone ? 1 - ease(0, 0.1, phase) : 0;
      const sway = idle * 0.22 * Math.sin(time / 1500);
      const stage: Stage = { ...origin, dockX: origin.x, dockY, sway };
      const docked = hasEmblem ? ease(0.86, 1, phase) : ease(0.01, 0.15, phase);
      const bucket = animating ? Math.round(time / 33) : 0;
      const stamp = [phase, progress, stage.x, stage.top, stage.height, width, height, bucket, introDone ? 1 : Math.round(introP * 200)].join(":");
      if (stamp === lastPaint) return;
      lastPaint = stamp;
      ctx!.clearRect(0, 0, width, height);

      if (hasEmblem && phase < 1) {
        // Resample by physical length. Parameter-space interpolation would stretch the body
        // hundreds of pixels when it reached the horizontal part of the route.
        const route = Array.from({ length: 650 }, (_, i) => journeyPoint(i / 649 * ROUTE, stage));
        const lengths = [0];
        for (let i = 1; i < route.length; i++) lengths.push(lengths[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y));
        const start = lengths[Math.round(0.92 / ROUTE * 649)];
        const originalLength = start - lengths[Math.round(0.06 / ROUTE * 649)];
        const bodyLength = originalLength * mix(1, 0.15, ease(0.34, 0.88, phase));
        // Intro: the head climbs from the foot to its resting place; the body trails and is simply not drawn below the foot.
        const slither = 1 - (1 - ease(0, 1, clamp((introP - 0.3) / 0.7))) ** 3;
        const headBase = mix(0, start, slither);
        const headDistance = mix(headBase, lengths[649] + originalLength * 0.15, phase);
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
        const rawPoints = Array.from({ length: 200 }, (_, i) => {
          const body = i / 199;
          const d = headDistance - body * bodyLength;
          return { ...pointAt(d), body, d };
        });
        // Mid-launch the body turns into the heartbeat: it thins to the ECG's weight and the QRS profile
        // grows along it, so what reaches the header is already the pulse, not a snake fading out.
        const morph = ease(0.3, 0.86, phase);
        const points = morph <= 0 ? rawPoints : rawPoints.map((p, i) => {
          const before = rawPoints[Math.max(0, i - 1)];
          const after = rawPoints[Math.min(rawPoints.length - 1, i + 1)];
          const dx = after.x - before.x;
          const dy = after.y - before.y;
          const len = Math.hypot(dx, dy) || 1;
          const amp = heartbeat(1 - 2 * p.body) * 11 * morph * Math.sin(Math.PI * p.body);
          return { ...p, x: p.x - (dy / len) * amp, y: p.y + (dx / len) * amp };
        });
        const bodyAlpha = 1 - ease(0.93, 1, phase);
        // Staff first: it rises from the foot (ease-out expo), then the finial settles on top.
        const reveal = introDone ? 1 : 1 - 2 ** (-9 * clamp(introP / 0.42));
        const finial = introDone ? 1 : ease(0.3, 0.5, introP);
        // The staff is drawn up with the snake: one wipe from the foot to the crown, so shaft, knots and foot
        // leave together instead of fading at different rates. A short alpha tail removes the last pixels.
        const poleAlpha = 1 - ease(0.78, 0.86, phase);
        const bottom = stage.top + stage.height;
        const renderBody = (front: boolean) => {
          for (let i = points.length - 1; i > 0; i--) {
            const p = points[i];
            if ((p.z >= 0) !== front || p.d <= 0) continue;
            const next = points[i - 1];
            const thickness = mix(mix(3, 21, Math.sin((1 - p.body) * Math.PI / 2)), 2.6, morph);
            const segAlpha = bodyAlpha * clamp(p.d / 70);
            // Head end is bright signal blue; the tail settles into the deeper blue.
            const colour = front ? tint(blue, dark, p.body * 0.32 * (1 - morph)) : tint(dark, blue, morph);
            line([p, next], colour, thickness, segAlpha);
            if (!front) continue;
            const length = Math.hypot(next.x - p.x, next.y - p.y) || 1;
            const nx = -(next.y - p.y) / length;
            const ny = (next.x - p.x) / length;
            const offset = thickness * 0.2;
            line([{ x: p.x + nx * offset, y: p.y + ny * offset }, { x: next.x + nx * offset, y: next.y + ny * offset }], mist, thickness * 0.2, segAlpha * 0.42 * (1 - morph));
            // Belly scutes: fine cross-ticks along the body read as scales without adding a texture layer.
            if (i % 5 === 0 && thickness > 6) {
              const half = thickness * 0.42;
              line([{ x: p.x - nx * half, y: p.y - ny * half }, { x: p.x + nx * half, y: p.y + ny * half }], navy, 1.1, segAlpha * 0.2 * (1 - morph));
            }
          }
        };

        renderBody(false);
        // The staff stays upright. It disappears only after the snake has cleared it.
        ctx!.save();
        ctx!.globalAlpha = poleAlpha;
        const clipTop = bottom + 20 - (stage.height + 70) * reveal;
        // The wipe trails the snake's tail: nothing below where the tail has climbed to is left standing.
        // `lead` is the tail's resting height above the foot plus the foot's own margin, so at rest the
        // line sits exactly under the foot and the staff is whole.
        const tail = rawPoints[rawPoints.length - 1];
        // The gap below the tail starts at the resting margin and closes to a few pixels within the first stretch of scroll.
        const lead = mix(stage.height * 0.06 + 24, 6, ease(0, 0.12, phase));
        const followTail = Math.max(stage.top - 56, tail.y + lead);
        const wipeLine = mix(bottom + 24, Math.min(bottom + 24, followTail), ease(0, 0.02, phase));
        const clipBottom = Math.min(clipTop + stage.height + 70, wipeLine);
        ctx!.beginPath();
        ctx!.rect(0, clipTop, width, Math.max(0, clipBottom - clipTop));
        ctx!.clip();
        const staffFinish = ctx!.createLinearGradient(stage.x - 6, 0, stage.x + 6, 0);
        staffFinish.addColorStop(0, blue);
        staffFinish.addColorStop(0.3, mist);
        staffFinish.addColorStop(0.52, white);
        staffFinish.addColorStop(1, blue);
        ctx!.fillStyle = staffFinish;
        // Shaft, slightly tapered toward the top.
        ctx!.beginPath();
        ctx!.moveTo(stage.x - 6, bottom);
        ctx!.lineTo(stage.x - 4.5, stage.top);
        ctx!.quadraticCurveTo(stage.x, stage.top - 3, stage.x + 4.5, stage.top);
        ctx!.lineTo(stage.x + 6, bottom);
        ctx!.quadraticCurveTo(stage.x, bottom + 4, stage.x - 6, bottom);
        ctx!.fill();
        line([{ x: stage.x - 1.8, y: stage.top + 2 }, { x: stage.x - 2.2, y: bottom - 2 }], white, 1.1, poleAlpha * 0.55);
        // Three knots, like a staff cut from a branch.
        for (const f of [0.22, 0.47, 0.71]) {
          ctx!.beginPath();
          ctx!.ellipse(stage.x, stage.top + stage.height * f, 7.5, 3.2, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.strokeStyle = navy;
          ctx!.globalAlpha = poleAlpha * 0.22;
          ctx!.lineWidth = 1;
          ctx!.stroke();
          ctx!.globalAlpha = poleAlpha;
        }
        // Foot.
        ctx!.beginPath();
        ctx!.roundRect(stage.x - 10, bottom - 1, 20, 8, 4);
        ctx!.fill();
        ctx!.restore();

        // Finial: a small orb on two collars. It lands after the shaft has risen.
        if (finial > 0) {
          ctx!.save();
          // The orb dissolves as the snake lifts off, so the head never passes a half-hidden ball.
          ctx!.globalAlpha = poleAlpha * finial * (1 - ease(0.005, 0.07, phase));
          const cx = stage.x;
          const cy = stage.top - 15 - (1 - finial) * 14;
          ctx!.translate(cx, cy);
          ctx!.scale(mix(0.55, 1, finial), mix(0.55, 1, finial));
          ctx!.translate(-cx, -cy);
          ctx!.fillStyle = staffFinish;
          ctx!.beginPath();
          ctx!.roundRect(cx - 8, cy + 11, 16, 3, 1.5);
          ctx!.roundRect(cx - 6.5, cy + 15.5, 13, 3, 1.5);
          ctx!.fill();
          const orb = ctx!.createRadialGradient(cx - 3, cy - 3.5, 1, cx, cy, 11);
          orb.addColorStop(0, white);
          orb.addColorStop(0.45, mist);
          orb.addColorStop(1, blue);
          ctx!.fillStyle = orb;
          ctx!.beginPath();
          ctx!.arc(cx, cy, 10, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.beginPath();
          ctx!.moveTo(cx - 3.2, cy - 8.6);
          ctx!.quadraticCurveTo(cx, cy - 22, cx + 3.2, cy - 8.6);
          ctx!.fill();
          ctx!.restore();
        }

        renderBody(true);

        const head = points[0];
        const neck = pointAt(headDistance - 3);
        const headAlpha = (1 - ease(0.5, 0.8, phase)) * clamp(headDistance / 70);
        if (headAlpha > 0) {
          ctx!.save();
          ctx!.translate(head.x, head.y);
          ctx!.rotate(Math.atan2(head.y - neck.y, head.x - neck.x));
          ctx!.scale(mix(1, 0.4, morph), mix(1, 0.4, morph));
          ctx!.globalAlpha = headAlpha;
          // Drawn in the body's own units: the rear is a round cap exactly as wide and as blue as the
          // neck, so the head grows out of the body instead of sitting on it.
          const hw = mix(3, 21, 1) / 2;
          ctx!.globalAlpha = headAlpha;
          const skin = ctx!.createLinearGradient(-hw, 0, hw * 2, 0);
          skin.addColorStop(0, blue);
          skin.addColorStop(0.5, blue);
          skin.addColorStop(1, tint(blue, dark, 0.25));
          ctx!.fillStyle = skin;
          ctx!.beginPath();
          ctx!.moveTo(0, -hw);
          ctx!.bezierCurveTo(hw * 0.9, -hw * 1.2, hw * 1.7, -hw * 0.5, hw * 2, 0);
          ctx!.bezierCurveTo(hw * 1.7, hw * 0.5, hw * 0.9, hw * 1.2, 0, hw);
          ctx!.arc(0, 0, hw, Math.PI / 2, Math.PI * 1.5);
          ctx!.closePath();
          ctx!.fill();
          ctx!.strokeStyle = mist;
          ctx!.lineWidth = 1.2;
          ctx!.lineCap = "round";
          ctx!.globalAlpha = headAlpha * 0.5;
          ctx!.beginPath();
          ctx!.moveTo(hw * 0.1, -hw * 0.8);
          ctx!.bezierCurveTo(hw * 0.9, -hw * 1.0, hw * 1.4, -hw * 0.5, hw * 1.6, -hw * 0.15);
          ctx!.stroke();
          ctx!.globalAlpha = headAlpha;
          ctx!.fillStyle = navy;
          ctx!.beginPath();
          ctx!.ellipse(hw * 0.85, -hw * 0.38, hw * 0.21, hw * 0.25, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = white;
          ctx!.beginPath();
          ctx!.arc(hw * 0.93, -hw * 0.46, hw * 0.075, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        }
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
      if (live && !motion.matches) requestPaint();
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
      if (!live) introDone = true;
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
