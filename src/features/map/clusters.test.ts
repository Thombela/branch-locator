import { clusterPoints } from './clusters';

const point = (id: string, x: number, y: number) => ({ id, x, y });

describe('clusterPoints', () => {
  it('groups pins that would overlap and leaves the rest alone', () => {
    const clusters = clusterPoints(
      [point('a', 0, 0), point('b', 10, 10), point('c', 200, 0), point('d', 5, -5)],
      28,
    );
    expect(clusters.map((c) => c.ids)).toEqual([['a', 'b', 'd'], ['c']]);
    expect(clusters[0]).toMatchObject({ x: 5, y: 5 / 3 });
  });

  it('never hides a kept pin inside a cluster', () => {
    const clusters = clusterPoints(
      [point('a', 0, 0), point('b', 4, 4), point('c', 8, 8)],
      28,
      new Set(['b']),
    );
    expect(clusters.map((c) => c.ids)).toEqual([['a', 'c'], ['b']]);
  });

  it('puts nothing together when the radius is zero', () => {
    expect(clusterPoints([point('a', 0, 0), point('b', 1, 1)], 0)).toHaveLength(2);
  });
});
