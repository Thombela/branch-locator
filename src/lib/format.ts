import { APP_TIME_ZONE } from './dates';

const timeFormatter = new Intl.DateTimeFormat('en-ZA', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: APP_TIME_ZONE,
});

/** Wall-clock time of an instant in the app's time zone, e.g. `16:30`. */
export function formatTime(isoDateTime: string): string {
  return timeFormatter.format(new Date(isoDateTime));
}
