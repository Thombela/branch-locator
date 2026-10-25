/**
 * Calendar helpers on plain `YYYY-MM-DD` strings in South African time, so opening hours
 * don't depend on the device's time zone.
 */

export const APP_TIME_ZONE = 'Africa/Johannesburg';

const DAY_MS = 86_400_000;

const isoDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's calendar date in the app's time zone, e.g. `2024-09-16`. */
export function todayIso(now: Date = new Date()): string {
  return isoDayFormatter.format(now);
}

/** Calendar date (app time zone) of an ISO date-time such as `2024-09-16T14:30:00Z`. */
export function toLocalIsoDate(isoDateTime: string): string {
  return isoDayFormatter.format(new Date(isoDateTime));
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}
