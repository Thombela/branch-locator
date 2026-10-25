import { projectMomentum } from '@/lib/motion';

export const DETENTS = ['peek', 'half', 'full'] as const;
export type Detent = (typeof DETENTS)[number];

export const PEEK_HEIGHT = 168;
const TOP_GAP = 72;

/** Visible height of each detent for a given viewport. */
export function detentHeights(viewportHeight: number): Record<Detent, number> {
  const full = Math.max(viewportHeight - TOP_GAP, PEEK_HEIGHT);
  return { peek: PEEK_HEIGHT, half: Math.max(Math.round(viewportHeight * 0.5), PEEK_HEIGHT), full };
}

/**
 * Picks the resting point nearest to where a flick would stop, so a short, quick flick still
 * travels a whole step.
 */
export function nearestDetent(
  visibleHeight: number,
  upwardVelocity: number,
  heights: Record<Detent, number>,
): Detent {
  const projected = visibleHeight + projectMomentum(upwardVelocity);
  return DETENTS.reduce((best, detent) =>
    Math.abs(heights[detent] - projected) < Math.abs(heights[best] - projected) ? detent : best,
  );
}
