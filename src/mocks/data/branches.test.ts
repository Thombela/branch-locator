import { loadBranches, openStatus, queueEstimate } from './branches';

const branches = loadBranches();
const byId = (id: string) => branches.find((b) => b.id === id)!;
const street = byId('br_cape_town_grand_central'); // closed on Sunday
const allDay = byId('br_atm_cape_town_grand_parade');
const lateNight = byId('br_atm_raage_mini_market'); // 08:00 until midnight

const at = (iso: string) => new Date(iso);

describe('branch network', () => {
  it('has the whole network from the feed, with unique IDs and names', () => {
    expect(branches.length).toBeGreaterThan(3500);
    expect(new Set(branches.map((b) => b.id)).size).toBe(branches.length);
    expect(new Set(branches.map((b) => b.name)).size).toBe(branches.length);
  });

  it('gives every location a type, a full week of hours and a city', () => {
    for (const branch of branches) {
      expect(branch.services).toEqual(
        expect.arrayContaining([expect.stringMatching(/^(branch|atm|business_banking)$/)]),
      );
      expect(branch.hours).toHaveLength(7);
      expect(branch.address.city).not.toBe('');
    }
  });

  it('counts a cash-accepting ATM as an ATM', () => {
    expect(allDay.services).toEqual(['atm', 'cash_deposit']);
  });
});

describe('openStatus (South African time)', () => {
  it('is open during hours, with the closing time', () => {
    expect(openStatus(street.hours, at('2024-09-16T08:00:00Z'))).toEqual({
      isOpen: true,
      closesAt: '2024-09-16T17:00:00+02:00',
      opensAt: null,
    });
  });

  it('opens later today before opening time', () => {
    expect(openStatus(street.hours, at('2024-09-16T05:00:00Z')).opensAt).toBe(
      '2024-09-16T08:00:00+02:00',
    );
  });

  it('opens tomorrow after closing time', () => {
    expect(openStatus(street.hours, at('2024-09-16T16:30:00Z')).opensAt).toBe(
      '2024-09-17T08:00:00+02:00',
    );
  });

  it('skips a closed Sunday to Monday morning', () => {
    // Saturday 14:00 SAST, after the 13:00 close.
    expect(openStatus(street.hours, at('2024-09-21T12:00:00Z'))).toEqual({
      isOpen: false,
      closesAt: null,
      opensAt: '2024-09-23T08:00:00+02:00',
    });
  });

  it('keeps 24-hour ATMs open in the small hours, with no closing time', () => {
    expect(openStatus(allDay.hours, at('2024-09-22T01:00:00Z'))).toEqual({
      isOpen: true,
      closesAt: null,
      opensAt: null,
    });
  });

  it('closes at midnight when the hours run to 24:00', () => {
    expect(openStatus(lateNight.hours, at('2024-09-16T21:30:00Z'))).toEqual({
      isOpen: true,
      closesAt: '2024-09-17T00:00:00+02:00',
      opensAt: null,
    });
    expect(openStatus(lateNight.hours, at('2024-09-16T22:30:00Z')).opensAt).toBe(
      '2024-09-17T08:00:00+02:00',
    );
  });

  it('treats closing time as closed', () => {
    expect(openStatus(street.hours, at('2024-09-16T15:00:00Z')).isOpen).toBe(false);
  });
});

describe('queueEstimate', () => {
  it('is busier at lunchtime than first thing', () => {
    const morning = queueEstimate(street, at('2024-09-16T06:30:00Z'))!;
    const lunch = queueEstimate(street, at('2024-09-16T10:30:00Z'))!;
    expect(lunch).toBeGreaterThan(morning);
    expect(morning).toBeGreaterThanOrEqual(0);
  });

  it('has no queue at an ATM', () => {
    expect(queueEstimate(allDay, at('2024-09-16T10:30:00Z'))).toBeNull();
  });
});
