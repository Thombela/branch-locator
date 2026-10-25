import { hasActiveFilters, readFilters, writeFilters } from './urlState';

describe('url state', () => {
  it('reads filters with safe defaults', () => {
    expect(readFilters(new URLSearchParams(''))).toEqual({
      openNow: false,
      services: [],
      radiusKm: 10,
    });
    expect(readFilters(new URLSearchParams('open=1&services=atm,forex&radius=25'))).toEqual({
      openNow: true,
      services: ['atm', 'forex'],
      radiusKm: 25,
    });
    expect(readFilters(new URLSearchParams('radius=999')).radiusKm).toBe(10);
  });

  it('writes only non-default filters and keeps other params', () => {
    const next = writeFilters(new URLSearchParams('branch=br_x'), {
      openNow: true,
      services: ['atm'],
      radiusKm: 10,
    });
    expect(next.toString()).toBe('branch=br_x&open=1&services=atm');
    expect(writeFilters(next, { openNow: false, services: [], radiusKm: 10 }).toString()).toBe(
      'branch=br_x',
    );
  });

  it('knows when filters narrow the results', () => {
    expect(hasActiveFilters({ openNow: false, services: [], radiusKm: 50 })).toBe(false);
    expect(hasActiveFilters({ openNow: true, services: [], radiusKm: 10 })).toBe(true);
  });
});
