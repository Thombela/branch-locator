import {
  displayName,
  formatPhone,
  normaliseFeed,
  parseAddress,
  storeId,
  storeServices,
  to24h,
  weekHours,
  type FeedStore,
} from './storeFeed';

/** Saturday 24 October 2026, 13:46 SAST: the day the feed's "today" hours describe. */
const fetchedAt = new Date('2026-10-24T11:46:00Z');

const feedStore = (overrides: Partial<FeedStore> = {}): FeedStore => ({
  name: 'Capitec Bank Cape Town Golden Acre',
  brand: 'locator-over-acoustic',
  storeCode: 'floatable-trihedral-basenji',
  primaryNumber: '+27860102043',
  address:
    'Shop S41, Golden Acre Shopping Centre, Strand Street, Foreshore, Cape Town, Western Cape, 8001, South Africa',
  latitude: -33.923596,
  longitude: 18.4245679,
  trading_status: 'Open',
  attributes: [{ value: 'Branch' }],
  specialOperatingHours: ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'].map(
    (date) => ({ date, open: '08:00', close: '17:00', closed: false }),
  ),
  operating_hours: { operating_time_open: '8:00 AM', operating_time_closed: '1:00 PM' },
  ...overrides,
});

describe('displayName', () => {
  it('drops the site codes the feed adds to names', () => {
    expect(displayName('Capitec Bank ATM Shoprite Belhar 50869')).toBe(
      'Capitec Bank ATM Shoprite Belhar',
    );
    expect(displayName('Capitec Bank ATM Glencoe Spar 3R')).toBe('Capitec Bank ATM Glencoe Spar');
    expect(displayName('Capitec Bank ATM Makro Alberton 462-0018')).toBe(
      'Capitec Bank ATM Makro Alberton',
    );
    expect(displayName('Capitec Bank ATM Embalenhle Ekhaya 18a1')).toBe(
      'Capitec Bank ATM Embalenhle Ekhaya',
    );
    expect(displayName('Capitec Bank ATM CTICC Cape Town1 R')).toBe(
      'Capitec Bank ATM CTICC Cape Town 1',
    );
    expect(displayName('Capitec Bank ATM Cape Town Strand Str Conc')).toBe(
      'Capitec Bank ATM Cape Town Strand Street Concourse',
    );
  });

  it('keeps names that are already clean, including road numbers', () => {
    expect(displayName('Capitec Bank Cape Town Golden Acre')).toBe(
      'Capitec Bank Cape Town Golden Acre',
    );
    expect(displayName('Capitec Bank ATM Shell R300')).toBe('Capitec Bank ATM Shell R300');
  });
});

describe('parseAddress', () => {
  it('splits a full address', () => {
    expect(parseAddress(feedStore().address)).toEqual({
      street: 'Shop S41, Golden Acre Shopping Centre, Strand Street',
      suburb: 'Foreshore',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001',
    });
  });

  it('doesn’t mistake a street for a suburb', () => {
    expect(
      parseAddress(
        'Cape Town Railway Station, Station Deck Road, Cape Town, Western Cape, 8001, South Africa',
      ),
    ).toMatchObject({ street: 'Cape Town Railway Station, Station Deck Road', suburb: '' });
  });

  it('copes with a missing province and a postcode that lost its leading zero', () => {
    expect(parseAddress('Stasie Road, Tzaneen, 850')).toEqual({
      street: 'Stasie Road',
      suburb: '',
      city: 'Tzaneen',
      province: '',
      postalCode: '0850',
    });
    expect(parseAddress('Cape Town, Western Cape, 8001, South Africa')).toMatchObject({
      street: '',
      city: 'Cape Town',
    });
  });
});

describe('storeServices', () => {
  it('maps attributes, counting a cash-accepting ATM as an ATM', () => {
    expect(
      storeServices({
        name: 'Capitec Bank ATM Cape Town Grand Parade',
        brand: 'fairish-unidentified-wildebeast',
        attributes: [{ value: 'Cash Accepting ATM' }],
      }),
    ).toEqual(['atm', 'cash_deposit']);
  });

  it('falls back to the brand code when a store has no attributes', () => {
    expect(
      storeServices({
        name: 'Capitec Bank ATM Edgemead',
        brand: 'fairish-unidentified-wildebeast',
        attributes: [],
      }),
    ).toEqual(['atm']);
    expect(
      storeServices({
        name: 'Capitec Bank Somewhere',
        brand: 'locator-over-acoustic',
        attributes: [{ value: 'SmartID Services' }],
      }),
    ).toEqual(['branch', 'smart_id']);
  });
});

describe('hours', () => {
  it('converts 12-hour times, with a midnight close as 24:00', () => {
    expect(to24h('8:00 AM')).toBe('08:00');
    expect(to24h('12:00 PM')).toBe('12:00');
    expect(to24h('5:30 PM')).toBe('17:30');
    expect(to24h('12:00 AM')).toBe('00:00');
    expect(to24h('12:00 AM', true)).toBe('24:00');
    expect(() => to24h('noon')).toThrow();
  });

  it('builds a branch week from its weekday hours and today’s Saturday hours', () => {
    const store = feedStore();
    expect(weekHours(store, storeServices(store), fetchedAt)).toEqual([
      ['08:00', '17:00'],
      ['08:00', '17:00'],
      ['08:00', '17:00'],
      ['08:00', '17:00'],
      ['08:00', '17:00'],
      ['08:00', '13:00'],
      null,
    ]);
  });

  it('gives an ATM today’s hours every day, ending past-midnight hours at 24:00', () => {
    const store = feedStore({
      attributes: [{ value: 'ATM' }],
      specialOperatingHours: [],
      operating_hours: { operating_time_open: '7:00 AM', operating_time_closed: '2:00 AM' },
    });
    expect(new Set(weekHours(store, ['atm'], fetchedAt).map(String))).toEqual(
      new Set(['07:00,24:00']),
    );
  });
});

describe('normaliseFeed', () => {
  it('keeps open stores only, with unique IDs and a readable phone number', () => {
    const stores = normaliseFeed(
      [
        feedStore(),
        feedStore({ storeCode: 'twin' }),
        feedStore({ name: 'Capitec Bank ATM Gone', trading_status: 'Permanently Closed' }),
      ],
      fetchedAt,
    );
    expect(stores.map((s) => s.id)).toEqual([
      'br_cape_town_golden_acre',
      'br_cape_town_golden_acre_2',
    ]);
    expect(stores[0]).toMatchObject({ phone: '+27 86 010 2043', hasQueue: true, lat: -33.9236 });
  });

  it('names IDs after the store, without the bank’s name', () => {
    expect(storeId('Capitec Bank ATM Café Société 2')).toBe('br_atm_cafe_societe_2');
    expect(storeId('Capitec Business Centre Cape Town')).toBe('br_business_centre_cape_town');
    expect(formatPhone(null)).toBe('');
  });
});
