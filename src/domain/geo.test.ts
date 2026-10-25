import { directionsUrl, distanceKm, formatDistance } from './geo';

describe('geo', () => {
  it('measures great-circle distance', () => {
    const johannesburg = { lat: -26.2041, lng: 28.0473 };
    const pretoria = { lat: -25.7461, lng: 28.1881 };
    expect(distanceKm(johannesburg, pretoria)).toBeCloseTo(52.6, 0);
    expect(distanceKm(johannesburg, johannesburg)).toBe(0);
  });

  it('formats distances at a sensible precision', () => {
    expect(formatDistance(0.004)).toBe('10 m');
    expect(formatDistance(0.347)).toBe('350 m');
    expect(formatDistance(4.27)).toBe('4.3 km');
    expect(formatDistance(23.4)).toBe('23 km');
  });

  it('links to turn-by-turn directions', () => {
    expect(directionsUrl({ lat: -26.1, lng: 28.05 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-26.1,28.05',
    );
  });
});
