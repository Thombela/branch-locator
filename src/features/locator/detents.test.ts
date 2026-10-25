import { detentHeights, nearestDetent } from './detents';

describe('detent physics', () => {
  const heights = detentHeights(844);

  it('derives three resting heights from the viewport', () => {
    expect(heights).toEqual({ peek: 168, half: 422, full: 772 });
  });

  it('settles at the nearest detent when released gently', () => {
    expect(nearestDetent(300, 0, heights)).toBe('half');
    expect(nearestDetent(200, 0, heights)).toBe('peek');
  });

  it('lets a quick flick carry the sheet a whole detent', () => {
    // Released just above peek, but flicked upwards fast: the projection lands near "half".
    expect(nearestDetent(200, 600, heights)).toBe('half');
    expect(nearestDetent(450, 1500, heights)).toBe('full');
    expect(nearestDetent(700, -1500, heights)).toBe('peek');
  });
});
