export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

export interface Cluster {
  ids: string[];
  x: number;
  y: number;
}

/**
 * Groups pins that would overlap on screen. Points are taken in order (nearest branch
 * first), and each one gathers every free point within `radius` pixels. Ids in `keep`
 * always stay on their own, so the selected branch is never hidden inside a cluster.
 */
export function clusterPoints(
  points: readonly ScreenPoint[],
  radius: number,
  keep: ReadonlySet<string> = new Set(),
): Cluster[] {
  const taken = new Set<string>();
  const clusters: Cluster[] = [];
  for (const point of points) {
    if (taken.has(point.id)) continue;
    taken.add(point.id);
    const members = [point];
    if (!keep.has(point.id)) {
      for (const other of points) {
        if (taken.has(other.id) || keep.has(other.id)) continue;
        if (Math.hypot(other.x - point.x, other.y - point.y) <= radius) {
          taken.add(other.id);
          members.push(other);
        }
      }
    }
    clusters.push({
      ids: members.map((m) => m.id),
      x: members.reduce((sum, m) => sum + m.x, 0) / members.length,
      y: members.reduce((sum, m) => sum + m.y, 0) / members.length,
    });
  }
  return clusters;
}
