import type { BranchDetail, DayHours, OpenStatus } from '@/api/schemas';
import { DAYS, localDay } from '@/domain/hours';
import { addDays, todayIso } from '@/lib/dates';
import { createRandom } from './random';
import { displayName, type ServiceId } from './storeFeed';
import { STORES } from './stores';

export const SERVICES = [
  { id: 'branch', label: 'Branch' },
  { id: 'atm', label: 'ATM' },
  { id: 'cash_deposit', label: 'Cash deposits' },
  { id: 'smart_id', label: 'Smart ID' },
  { id: 'business_banking', label: 'Business banking' },
] as const satisfies readonly { id: ServiceId; label: string }[];

/** The store feed has no facility data. */
export const FACILITIES: readonly { id: string; label: string }[] = [];

export interface MockBranch extends Omit<BranchDetail, 'openStatus' | 'queue'> {
  /** Base queue length for this branch; the live estimate varies it by hour. `null` for ATMs. */
  busyness: number | null;
}

/** The Capitec network from the store feed, with a seeded queue level per branch. */
export function loadBranches(seed = 2026): MockBranch[] {
  const random = createRandom(seed);
  const shortNames = STORES.map((store) => displayName(store.name));
  // Two stores can tidy to the same name; those keep the feed's name so they stay distinct.
  const clashes = new Set(shortNames.filter((name, i) => shortNames.indexOf(name) !== i));
  return STORES.map((store, i) => ({
    id: store.id,
    name: clashes.has(shortNames[i] ?? '') ? store.name : (shortNames[i] ?? store.name),
    address: store.address,
    location: { lat: store.lat, lng: store.lng },
    services: store.services,
    phone: store.phone,
    hours: DAYS.map((day, i): DayHours => {
      const hours = store.hours[i];
      return { day, open: hours?.[0] ?? null, close: hours?.[1] ?? null };
    }),
    facilities: [],
    busyness: store.hasQueue ? random.between(0.4, 1.4) : null,
  }));
}

const localTime = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Africa/Johannesburg',
});
const at = (isoDate: string, time: string) => `${isoDate}T${time}:00+02:00`;

/** Whether a branch is open at `now` and when that changes, in South African time. */
export function openStatus(hours: readonly DayHours[], now: Date): OpenStatus {
  const today = todayIso(now);
  const time = localTime.format(now);
  const todayIndex = DAYS.indexOf(localDay(now));
  const todays = hours[todayIndex];

  if (todays?.open && todays.close && time >= todays.open && time < todays.close) {
    // A day that runs to 24:00 carries on into the next one if that opens at midnight.
    let offset = 0;
    let close = todays.close;
    while (close === '24:00') {
      offset += 1;
      if (offset > 7) return { isOpen: true, closesAt: null, opensAt: null }; // always open
      const next = hours[(todayIndex + offset) % 7];
      close = next?.open === '00:00' && next.close ? next.close : '00:00';
    }
    return { isOpen: true, closesAt: at(addDays(today, offset), close), opensAt: null };
  }
  for (let offset = 0; offset < 8; offset += 1) {
    const day = hours[(todayIndex + offset) % 7];
    if (!day?.open) continue;
    if (offset === 0 && time >= day.open) continue;
    return { isOpen: false, closesAt: null, opensAt: at(addDays(today, offset), day.open) };
  }
  return { isOpen: false, closesAt: null, opensAt: null };
}

/** A believable queue estimate: busier at lunchtime and month-end, quiet first thing. */
export function queueEstimate(branch: MockBranch, now: Date): number | null {
  if (branch.busyness === null) return null;
  const hour = Number(localTime.format(now).slice(0, 2));
  const dayOfMonth = Number(todayIso(now).slice(8, 10));
  const lunch = hour >= 12 && hour < 14 ? 1.6 : hour < 10 ? 0.6 : 1;
  const monthEnd = dayOfMonth >= 25 || dayOfMonth <= 2 ? 1.5 : 1;
  return Math.round(12 * branch.busyness * lunch * monthEnd);
}
