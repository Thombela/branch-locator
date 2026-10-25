import type { DayHours, OpenStatus } from '@/api/schemas';
import { APP_TIME_ZONE, addDays, todayIso } from '@/lib/dates';

export const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const dayLabel = (day: Day) => DAY_LABELS[day];

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  timeZone: APP_TIME_ZONE,
});
const timeFormatter = new Intl.DateTimeFormat('en-ZA', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: APP_TIME_ZONE,
});

/** Day of the week in South Africa for an instant. */
export function localDay(instant: Date): Day {
  return weekdayFormatter.format(instant).toLowerCase() as Day;
}

/** `08:00 – 17:00`, `Open 24 hours`, or `Closed`. */
export function formatHours(hours: DayHours): string {
  if (!hours.open || !hours.close) return 'Closed';
  if (hours.open === '00:00' && hours.close === '24:00') return 'Open 24 hours';
  return `${hours.open} – ${hours.close}`;
}

/**
 * Status line such as "Open · Closes 17:00" or "Closed · Opens Mon 08:00". The day is only
 * named when the change isn't today.
 */
export function describeOpenStatus(
  status: OpenStatus,
  now: Date = new Date(),
): { label: string; detail: string } {
  const at = status.isOpen ? status.closesAt : status.opensAt;
  // Open with no closing time means open around the clock.
  if (!at)
    return status.isOpen ? { label: 'Open', detail: '24 hours' } : { label: 'Closed', detail: '' };
  const instant = new Date(at);
  const time = timeFormatter.format(instant);
  const today = todayIso(now);
  const day = todayIso(instant);
  const when =
    status.isOpen && time === '00:00' && day === addDays(today, 1)
      ? 'midnight'
      : day === today
        ? time
        : day === addDays(today, 1)
          ? `tomorrow ${time}`
          : `${DAY_LABELS[localDay(instant)].slice(0, 3)} ${time}`;
  return status.isOpen
    ? { label: 'Open', detail: `Closes ${when}` }
    : { label: 'Closed', detail: `Opens ${when}` };
}
