import { describeOpenStatus, formatHours, localDay } from './hours';

const now = new Date('2024-09-16T08:00:00Z'); // Monday 10:00 SAST

describe('hours', () => {
  it('uses the South African calendar day', () => {
    expect(localDay(now)).toBe('monday');
    expect(localDay(new Date('2024-09-15T22:30:00Z'))).toBe('monday'); // 00:30 SAST
  });

  it('formats a day’s hours', () => {
    expect(formatHours({ day: 'monday', open: '08:00', close: '17:00' })).toBe('08:00 – 17:00');
    expect(formatHours({ day: 'sunday', open: null, close: null })).toBe('Closed');
    expect(formatHours({ day: 'sunday', open: '00:00', close: '24:00' })).toBe('Open 24 hours');
  });

  it.each([
    [
      { isOpen: true, closesAt: '2024-09-16T17:00:00+02:00', opensAt: null },
      'Open',
      'Closes 17:00',
    ],
    [
      { isOpen: false, closesAt: null, opensAt: '2024-09-16T13:00:00+02:00' },
      'Closed',
      'Opens 13:00',
    ],
    [
      { isOpen: false, closesAt: null, opensAt: '2024-09-17T08:00:00+02:00' },
      'Closed',
      'Opens tomorrow 08:00',
    ],
    [
      { isOpen: false, closesAt: null, opensAt: '2024-09-19T08:00:00+02:00' },
      'Closed',
      'Opens Thu 08:00',
    ],
    [
      { isOpen: true, closesAt: '2024-09-17T00:00:00+02:00', opensAt: null },
      'Open',
      'Closes midnight',
    ],
    [{ isOpen: true, closesAt: null, opensAt: null }, 'Open', '24 hours'],
  ])('describes %j', (status, label, detail) => {
    expect(describeOpenStatus(status, now)).toEqual({ label, detail });
  });
});
