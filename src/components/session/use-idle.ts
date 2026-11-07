"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Idle timeout (WCAG 2.2.1 Timing Adjustable): after `idleMs` without interaction a warning shows a
 * `graceMs` countdown that any interaction cancels; at zero `onExpire` wipes the session.
 */
export function useIdle({
  enabled,
  idleMs,
  graceMs,
  onExpire,
}: {
  enabled: boolean;
  idleMs: number;
  graceMs: number;
  onExpire: () => void;
}) {
  const [warningLeft, setWarningLeft] = useState<number | null>(null);
  const idleTimer = useRef<number | undefined>(undefined);
  const tick = useRef<number | undefined>(undefined);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  const clearTimers = () => {
    window.clearTimeout(idleTimer.current);
    window.clearInterval(tick.current);
  };

  // Schedules the idle timer without touching state (safe to call from an effect).
  const schedule = useCallback(() => {
    clearTimers();
    idleTimer.current = window.setTimeout(() => {
      const until = Date.now() + graceMs;
      setWarningLeft(Math.ceil(graceMs / 1000));
      tick.current = window.setInterval(() => {
        const left = Math.ceil((until - Date.now()) / 1000);
        if (left <= 0) {
          clearTimers();
          setWarningLeft(null);
          expireRef.current();
        } else setWarningLeft(left);
      }, 250);
    }, idleMs);
  }, [idleMs, graceMs]);

  // Any interaction: hide the warning and start counting again.
  const arm = useCallback(() => {
    setWarningLeft(null);
    schedule();
  }, [schedule]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }
    schedule();
    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    return () => {
      clearTimers();
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [enabled, arm, schedule]);

  return { warningLeft: enabled ? warningLeft : null, keepAlive: arm };
}
