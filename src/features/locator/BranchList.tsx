import { SearchX } from 'lucide-react';
import type { BranchSummary } from '@/api/schemas';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/States';
import { formatDistance } from '@/domain/geo';
import { OpenStatus } from './OpenStatus';
import styles from './BranchList.module.css';

interface BranchListProps {
  branches: readonly BranchSummary[];
  total: number;
  originLabel: string;
  radiusKm: number;
  busy: boolean;
  highlightedId: string | null;
  hasFilters: boolean;
  onSelect: (branch: BranchSummary) => void;
  onHighlight: (id: string | null) => void;
  onClearFilters: () => void;
  onWiden: (() => void) | null;
  /** The mobile sheet shows the count in its header instead. */
  showSummary?: boolean;
}

export function BranchList({
  branches,
  total,
  originLabel,
  radiusKm,
  busy,
  highlightedId,
  hasFilters,
  onSelect,
  onHighlight,
  onClearFilters,
  onWiden,
  showSummary = true,
}: BranchListProps) {
  if (branches.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No branches here"
        message={`Nothing matches within ${radiusKm} km of ${originLabel}${hasFilters ? ' with these filters' : ''}.`}
        action={
          hasFilters ? (
            <Button onClick={onClearFilters}>Clear filters</Button>
          ) : onWiden ? (
            <Button onClick={onWiden}>Search a wider area</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      {showSummary && (
        <p className={styles.summary} aria-live="polite">
          {total === 1 ? '1 branch' : `${total} branches`} within {radiusKm} km of {originLabel}
        </p>
      )}
      <ul className={styles.list} aria-busy={busy} aria-label="Nearby branches">
        {branches.map((branch) => (
          <li key={branch.id} className={styles.item}>
            <button
              type="button"
              className={styles.row}
              data-highlighted={branch.id === highlightedId}
              onClick={() => onSelect(branch)}
              onPointerEnter={() => onHighlight(branch.id)}
              onPointerLeave={() => onHighlight(null)}
              onFocus={() => onHighlight(branch.id)}
              onBlur={() => onHighlight(null)}
            >
              <span className={styles.name} title={branch.name}>
                {branch.name}
              </span>
              <span className={styles.distance}>{formatDistance(branch.distanceKm)}</span>
              <OpenStatus status={branch.openStatus} />
              <span className={styles.address}>
                {[branch.address.street, branch.address.suburb].filter(Boolean).join(', ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function BranchListSkeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={styles.skeleton}>
          <Skeleton width="65%" />
          <Skeleton width="40%" height="0.8rem" />
          <Skeleton width="80%" height="0.8rem" />
        </div>
      ))}
    </div>
  );
}
