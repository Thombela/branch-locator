/**
 * Per-device preferences in `localStorage`. Storage can be unavailable (private mode,
 * blocked site data), so every access is guarded and the app works without it.
 */
const PREFIX = 'branch-locator:';

export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}
