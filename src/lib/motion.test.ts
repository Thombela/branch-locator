import { projectMomentum } from './motion';

describe('motion physics', () => {
  it('projects a flick forward using exponential deceleration', () => {
    expect(projectMomentum(0)).toBe(0);
    expect(projectMomentum(1000)).toBeCloseTo(499, 0);
    expect(projectMomentum(-1000)).toBeCloseTo(-499, 0);
  });
});
