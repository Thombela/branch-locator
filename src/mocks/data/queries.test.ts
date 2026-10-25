import { loadBranches } from './branches';
import { branchDetail, searchBranches, searchPlaces } from './queries';

const branches = loadBranches();
const now = new Date('2024-09-16T08:00:00Z');
const capeTown = { lat: -33.9249, lng: 18.4241 };
const base = {
  origin: capeTown,
  radiusKm: 10,
  services: [] as string[],
  openNow: false,
  limit: 50,
};

describe('searchBranches', () => {
  it('returns branches within the radius, nearest first', () => {
    const result = searchBranches(branches, base, now);
    expect(result.total).toBeGreaterThan(3);
    const distances = result.branches.map((b) => b.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(Math.max(...distances)).toBeLessThanOrEqual(10);
  });

  it('requires every requested service', () => {
    const result = searchBranches(branches, { ...base, services: ['atm', 'cash_deposit'] }, now);
    expect(result.branches.length).toBeGreaterThan(0);
    for (const b of result.branches)
      expect(b.services).toEqual(expect.arrayContaining(['atm', 'cash_deposit']));
  });

  it('filters to branches open right now', () => {
    const sunday = new Date('2024-09-22T08:00:00Z');
    const all = searchBranches(branches, { ...base, radiusKm: 50 }, sunday);
    const open = searchBranches(branches, { ...base, radiusKm: 50, openNow: true }, sunday);
    expect(open.total).toBeLessThan(all.total);
    expect(open.branches.every((b) => b.openStatus.isOpen)).toBe(true);
  });

  it('reports the full total even when the list is limited', () => {
    const limited = searchBranches(branches, { ...base, radiusKm: 50, limit: 3 }, now);
    expect(limited.branches).toHaveLength(3);
    expect(limited.total).toBeGreaterThan(3);
  });

  it('finds locations across the country', () => {
    expect(
      searchBranches(branches, { ...base, origin: { lat: -26.2041, lng: 28.0473 } }, now).total,
    ).toBeGreaterThan(50);
  });

  it('finds nothing in the middle of the Karoo', () => {
    expect(
      searchBranches(branches, { ...base, origin: { lat: -31.5, lng: 22.5 } }, now).total,
    ).toBe(0);
  });
});

describe('branchDetail', () => {
  it('estimates a queue at an open branch, but not at an ATM', () => {
    const detail = (id: string) =>
      branchDetail(
        branches.find((b) => b.id === id)!,
        now,
      );
    expect(detail('br_cape_town_golden_acre').queue).not.toBeNull();
    expect(detail('br_atm_cape_town_station').queue).toBeNull();
  });
});

describe('searchPlaces', () => {
  it('ranks name prefixes first and ignores case and accents', () => {
    expect(searchPlaces('sand', 5)[0]?.name).toBe('Sandton');
    expect(searchPlaces('GQEB', 5)[0]?.name).toBe('Gqeberha');
  });

  it('matches cities and provinces too', () => {
    expect(searchPlaces('durban', 10).map((p) => p.name)).toEqual(
      expect.arrayContaining(['Durban CBD', 'Umhlanga', 'Pinetown']),
    );
    expect(searchPlaces('limpopo', 10).map((p) => p.name)).toEqual(
      expect.arrayContaining(['Polokwane', 'Thohoyandou']),
    );
  });

  it('respects the limit', () => {
    expect(searchPlaces('gauteng', 3)).toHaveLength(3);
  });
});
