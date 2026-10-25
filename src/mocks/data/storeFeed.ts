/**
 * Turns the Capitec store feed (GoReview's location search, which capitecpages.localpages.io
 * uses) into the mock API's store records. `scripts/sync-stores.ts` runs this under plain Node,
 * so it imports nothing from the app.
 */
import { z } from 'zod';

export const FEED_URL = 'https://admin.goreview.co.za/website/api/locations/search';

/** `initialLoad` returns the whole network; otherwise the feed returns only the nearest 15. */
export const FEED_REQUEST = {
  domain: 'capitecpages.localpages.io',
  latitude: '-33.9249',
  longitude: '18.4241',
  attributes: '[]',
  radius: '100',
  initialLoad: 'true',
  selectedCountryFilter: 'null',
  selectedProvinceFilter: 'null',
  selectedCityFilter: 'null',
  selectedSuburbFilter: 'null',
};

const feedStoreSchema = z.object({
  name: z.string().min(1),
  brand: z.string(),
  storeCode: z.string(),
  primaryNumber: z.string().nullable(),
  address: z.string(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  trading_status: z.string(),
  attributes: z.array(z.object({ value: z.string() })),
  specialOperatingHours: z.array(
    z.object({
      date: z.iso.date(),
      open: z.string().nullable(),
      close: z.string().nullable(),
      closed: z.boolean(),
    }),
  ),
  operating_hours: z.object({
    operating_time_open: z.string().nullable(),
    operating_time_closed: z.string().nullable(),
  }),
});

export const feedSchema = z.object({ stores: z.array(feedStoreSchema) });
export type FeedStore = z.infer<typeof feedStoreSchema>;

export const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
type Day = (typeof DAYS)[number];

/** Opening and closing time, `HH:mm`; a close of `24:00` is midnight. `null` when closed. */
export type DayHours = [open: string, close: string] | null;

/** Feed attributes, as filterable service IDs. A cash-accepting ATM is also an ATM. */
export type ServiceId = 'branch' | 'atm' | 'cash_deposit' | 'smart_id' | 'business_banking';

export interface StoreRecord {
  id: string;
  /** Code in the store feed. */
  storeCode: string;
  name: string;
  services: ServiceId[];
  /** ATMs report no queue. */
  hasQueue: boolean;
  address: { street: string; suburb: string; city: string; province: string; postalCode: string };
  lat: number;
  lng: number;
  phone: string;
  /** Monday first. */
  hours: DayHours[];
}

const SERVICE_ORDER: ServiceId[] = [
  'branch',
  'business_banking',
  'atm',
  'cash_deposit',
  'smart_id',
];

const ATTRIBUTE_SERVICES: Record<string, ServiceId[]> = {
  Branch: ['branch'],
  'Business Banking Centre': ['business_banking'],
  ATM: ['atm'],
  'Cash Accepting ATM': ['atm', 'cash_deposit'],
  'SmartID Services': ['smart_id'],
};

/** About 450 stores have no attributes; the feed's brand code still says what they are. */
const BRAND_KINDS: Record<string, ServiceId> = {
  'locator-over-acoustic': 'branch',
  'unburning-lovesick-bronco': 'business_banking',
  'governing-distinctive-ringtailedlemur': 'atm',
  'fairish-unidentified-wildebeast': 'atm',
};

const KINDS: ServiceId[] = ['branch', 'business_banking', 'atm'];

export function storeServices(
  store: Pick<FeedStore, 'attributes' | 'brand' | 'name'>,
): ServiceId[] {
  const services = new Set(store.attributes.flatMap((a) => ATTRIBUTE_SERVICES[a.value] ?? []));
  if (!KINDS.some((kind) => services.has(kind))) {
    services.add(
      BRAND_KINDS[store.brand] ??
        (/\bATM\b/.test(store.name)
          ? 'atm'
          : /Business Centre/.test(store.name)
            ? 'business_banking'
            : 'branch'),
    );
  }
  return SERVICE_ORDER.filter((service) => services.has(service));
}

const PROVINCES = new Set([
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
]);
const STREET =
  /\b(street|str|st|road|rd|avenue|ave|drive|dr|lane|ln|way|boulevard|highway|crescent|freeway)\.?$|^[RNM]\d+$/i;

/**
 * Feed addresses read "street, suburb, city, province, postcode, South Africa". A few skip
 * the province or suburb, or drop a postcode's leading zero.
 */
export function parseAddress(address: string): StoreRecord['address'] {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const take = (test: (part: string) => boolean) => {
    const last = parts.at(-1);
    if (last === undefined || !test(last)) return '';
    parts.pop();
    return last;
  };
  take((part) => part === 'South Africa');
  const postalCode = take((part) => /^\d{3,4}$/.test(part)).padStart(4, '0');
  const province = take((part) => PROVINCES.has(part));
  while (take((part) => PROVINCES.has(part))); // a few repeat the province
  const city = take(() => true);
  const suburb = parts.length > 1 ? take((part) => !STREET.test(part)) : '';
  return {
    street: parts.join(', '),
    suburb: suburb === city ? '' : suburb,
    city,
    province,
    postalCode: postalCode === '0000' ? '' : postalCode,
  };
}

/** `8:00 AM` becomes `08:00`; a closing time of `12:00 AM` is the end of the day, `24:00`. */
export function to24h(time: string, closing = false): string {
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(time.trim());
  if (!match) throw new Error(`Unrecognised time "${time}"`);
  const [, hour = '', minute = '', half = ''] = match;
  const hours = (Number(hour) % 12) + (half.toUpperCase() === 'PM' ? 12 : 0);
  const value = `${String(hours).padStart(2, '0')}:${minute}`;
  return closing && value === '00:00' ? '24:00' : value;
}

/** South African calendar date of an instant, `YYYY-MM-DD`. */
const sastDate = (instant: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(instant);

const weekday = (isoDate: string): Day =>
  DAYS[(new Date(`${isoDate}T12:00:00Z`).getUTCDay() + 6) % 7] ?? 'monday';

/** Assumed: the feed gives business centres no weekday hours. */
const BUSINESS_CENTRE_WEEKDAY: DayHours = ['08:30', '16:30'];

/**
 * The feed has today's hours for every store, and the coming weekdays' hours for branches.
 * ATMs keep today's hours every day. Branch days with no hours (Sunday, when synced on a
 * Saturday) count as closed.
 */
export function weekHours(store: FeedStore, services: ServiceId[], fetchedAt: Date): DayHours[] {
  const known = new Map<Day, DayHours>();
  for (const special of [...store.specialOperatingHours].sort((a, b) =>
    a.date.localeCompare(b.date),
  )) {
    const day = weekday(special.date);
    if (known.has(day)) continue;
    known.set(
      day,
      special.closed || !special.open || !special.close
        ? null
        : [special.open.slice(0, 5), special.close.slice(0, 5)],
    );
  }

  const { operating_time_open: open, operating_time_closed: close } = store.operating_hours;
  let today: DayHours = null;
  if (open && close) {
    const from = to24h(open);
    const to = to24h(close, true);
    // A few ATMs trade past midnight; the hours model ends each day at 24:00.
    today = [from, to > from ? to : '24:00'];
  }
  const todayName = weekday(sastDate(fetchedAt));
  if (!known.has(todayName)) known.set(todayName, today);

  return DAYS.map((day) => {
    const hours = known.get(day);
    if (hours !== undefined) return hours;
    if (services.includes('atm')) return today;
    if (services.includes('business_banking') && day !== 'saturday' && day !== 'sunday')
      return BUSINESS_CENTRE_WEEKDAY;
    return null;
  });
}

/** `+27860102043` becomes `+27 86 010 2043`. */
export function formatPhone(phone: string | null): string {
  const match = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(phone ?? '');
  return match ? `+27 ${match[1] ?? ''} ${match[2] ?? ''} ${match[3] ?? ''}` : (phone ?? '');
}

/**
 * Many feed names end in an internal site code ("Shoprite Belhar 50869", "Spar 3R",
 * "Makro Alberton 462-0018"). Customers don't know those, so they are dropped for display.
 */
export function displayName(name: string): string {
  return name
    .replace(/\s+\d+\s*-\s*\d+$/, '')
    .replace(/\s+[A-Z]?\d+[A-Za-z]{1,2}\d$/, '')
    .replace(/\s+\d*R$/, '')
    .replace(/\s+\d{4,}$/, '')
    .replace(/([a-z])(\d+)$/, '$1 $2')
    .replace(/\bStr\b/g, 'Street')
    .replace(/\bConc\b/g, 'Concourse');
}

/** `Capitec Bank Cape Town Golden Acre` becomes `br_cape_town_golden_acre`. */
export const storeId = (name: string) =>
  `br_${name
    .replace(/^Capitec (Bank )?/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')}`;

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/** Open stores only, sorted by ID so a re-sync produces a readable diff. */
export function normaliseFeed(stores: readonly FeedStore[], fetchedAt: Date): StoreRecord[] {
  const seen = new Set<string>();
  return stores
    .filter((store) => store.trading_status === 'Open')
    .map((store): StoreRecord => {
      let id = storeId(store.name);
      for (let n = 2; seen.has(id); n += 1) id = `${storeId(store.name)}_${n}`;
      seen.add(id);
      const services = storeServices(store);
      return {
        id,
        storeCode: store.storeCode,
        name: store.name,
        services,
        hasQueue: !services.includes('atm'),
        address: parseAddress(store.address),
        lat: round5(store.latitude),
        lng: round5(store.longitude),
        phone: formatPhone(store.primaryNumber),
        hours: weekHours(store, services, fetchedAt),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
