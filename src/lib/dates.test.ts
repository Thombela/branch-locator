import { addDays, toLocalIsoDate, todayIso } from './dates';

describe('dates', () => {
  it('resolves "today" in South African time, not UTC', () => {
    // 23:30 UTC is already the next day in Johannesburg (UTC+2).
    expect(todayIso(new Date('2024-09-16T23:30:00Z'))).toBe('2024-09-17');
    expect(toLocalIsoDate('2024-09-16T21:59:00Z')).toBe('2024-09-16');
  });

  it('does day arithmetic across month and year boundaries', () => {
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
  });
});
