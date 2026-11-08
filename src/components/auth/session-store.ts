import { ClinicianProfileSchema, type ClinicianProfile } from "../../lib/contracts/auth";

export type Snapshot = ClinicianProfile | null | "loading";

/** Memory only. A generation invalidates requests crossing an account boundary. */
export function createClinicianStore(load: () => Promise<unknown>, clearPatient: () => void) {
  let snapshot: Snapshot = "loading";
  let generation = 0;
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  function publish(next: ClinicianProfile | null) {
    const previous = snapshot === "loading" ? null : snapshot;
    if (previous?.id !== next?.id) clearPatient();
    snapshot = next;
    listeners.forEach(listener => listener());
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    set(profile: ClinicianProfile | null) {
      generation++;
      pending = undefined;
      publish(profile);
    },
    refresh() {
      if (pending) return pending;
      const current = generation;
      const request = (async () => {
        try {
          const raw = await load();
          const profile = raw === null ? null : ClinicianProfileSchema.parse(raw);
          if (generation === current) publish(profile);
        } catch {
          // A failed session check must never leave patient screens accessible.
          if (generation === current) publish(null);
        }
      })();
      pending = request;
      void request.finally(() => { if (pending === request) pending = undefined; });
      return request;
    },
    invalidate() {
      generation++;
      pending = undefined;
      clearPatient();
      publish(null);
    },
  };
}
