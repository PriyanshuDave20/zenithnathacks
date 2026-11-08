// Tiny bridge between the session flow (Frontend lane) and the gaze layer (input lane): the
// session tells us whether the doctor chose ICU mode; the layer enables eye tracking only then.
// Plain subscription, memory only - no storage, no patient data.
type Listener = (on: boolean) => void;

let requested = false;
const listeners = new Set<Listener>();

export function requestGaze(on: boolean) {
  if (requested === on) return;
  requested = on;
  for (const l of listeners) l(on);
}

export function isGazeRequested() {
  return requested;
}

/** Subscribe; returns an unsubscribe function. */
export function onGazeRequest(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
