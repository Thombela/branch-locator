import type { BranchMapProps } from '@/features/map/BranchMap';

/**
 * Stand-in for the WebGL map in jsdom. It exposes the same callbacks as buttons so tests
 * can "tap a pin" or "pan the map"; the real map is covered by the Playwright suite.
 */
export function FakeBranchMap({
  branches,
  selected,
  onSelect,
  onAreaChange,
  user,
}: BranchMapProps) {
  return (
    <div data-testid="map" data-selected={selected?.id ?? ''} data-user={user ? 'shown' : 'hidden'}>
      {branches.map((branch) => (
        <button key={branch.id} type="button" onClick={() => onSelect(branch.id)}>
          Pin: {branch.name}
        </button>
      ))}
      <button type="button" onClick={() => onAreaChange({ lat: -33.9258, lng: 18.4486 })}>
        Pan map to Woodstock
      </button>
    </div>
  );
}
