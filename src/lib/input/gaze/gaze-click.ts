/**
 * The gaze layer dispatches its dwell activations with this MouseEvent detail, so any listener
 * can tell a gaze-driven click from a real mouse tap without extra plumbing.
 */
export const GAZE_CLICK_DETAIL = 940701;

export function isGazeClick(e: { detail?: number } | null | undefined): boolean {
  return e?.detail === GAZE_CLICK_DETAIL;
}
