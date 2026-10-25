/**
 * Springs shared by every animated component, set with Motion's `bounce` and
 * `visualDuration`. No bounce means critically damped; a little bounce is kept for things
 * the customer has thrown.
 */
import type { Transition } from 'motion/react';

/** Default UI spring: critically damped (damping 1.0), response 0.35s. */
export const SPRING_DEFAULT: Transition = { type: 'spring', bounce: 0, visualDuration: 0.35 };

/** Small surfaces that should feel quick (suggestion lists). */
export const SPRING_SNAPPY: Transition = { type: 'spring', bounce: 0, visualDuration: 0.28 };

/** Used when the user prefers reduced motion: a short cross-fade instead of travel. */
export const FADE_REDUCED: Transition = { duration: 0.18, ease: 'easeOut' };

/**
 * Where a flick would come to rest if it slowed down naturally, using exponential decay.
 *
 * @param velocity release velocity in px/s
 * @param decelerationRate 0.998 for a normal scroll feel, 0.99 for a quicker stop
 * @returns distance in px from the release point
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
