import { optionLabel } from './labels';

it('labels options from the API first, then known values, then readable fallbacks', () => {
  expect(optionLabel('atm', [{ id: 'atm', label: 'Cash machine' }])).toBe('Cash machine');
  expect(optionLabel('smart_id')).toBe('Smart ID');
  expect(optionLabel('safe_deposit_boxes')).toBe('Safe deposit boxes');
});
