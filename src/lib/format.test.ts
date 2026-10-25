import { formatTime } from './format';

it('shows times in Johannesburg time', () => {
  expect(formatTime('2024-09-16T14:30:00Z')).toBe('16:30');
});
