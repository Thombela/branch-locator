import { Check, ChevronLeft, Navigation, Phone, Share, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useBranch, useFilterOptions } from '@/api/hooks';
import type { BranchSummary } from '@/api/schemas';
import { ErrorState, LoadingRegion, Skeleton } from '@/components/States';
import { directionsUrl, formatDistance } from '@/domain/geo';
import { DAYS, dayLabel, formatHours, localDay } from '@/domain/hours';
import { optionLabel } from '@/domain/labels';
import { cx } from '@/lib/cx';
import { formatTime } from '@/lib/format';
import { OpenStatus } from './OpenStatus';
import styles from './BranchDetail.module.css';

interface BranchDetailProps {
  branchId: string;
  /** Shown straight away while the full detail loads. */
  summary: BranchSummary | undefined;
  onBack: () => void;
}

export function BranchDetail({ branchId, summary, onBack }: BranchDetailProps) {
  const { data: branch, error, refetch, isFetching } = useBranch(branchId);
  const { data: options } = useFilterOptions();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [shareMessage, setShareMessage] = useState('');

  // Move focus to the new view so keyboard and screen-reader users know where they are.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [branchId]);

  const name = branch?.name ?? summary?.name ?? 'Branch';
  const status = branch?.openStatus ?? summary?.openStatus;
  const location = branch?.location ?? summary?.location;
  const today = localDay(new Date());

  const share = async () => {
    const url = `${window.location.origin}/?branch=${encodeURIComponent(branchId)}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage('Link copied');
      window.setTimeout(() => setShareMessage(''), 2500);
    } catch {
      // The share sheet was cancelled or the clipboard was refused. Nothing to report.
    }
  };

  return (
    <article className={styles.detail} aria-labelledby={`${branchId}-name`}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ChevronLeft size={20} aria-hidden="true" />
        All branches
      </button>

      <header className={styles.header}>
        <h2 id={`${branchId}-name`} ref={headingRef} className={styles.name} tabIndex={-1}>
          {name}
        </h2>
        <div className={styles.meta}>
          {status && <OpenStatus status={status} />}
          {summary && <span>{formatDistance(summary.distanceKm)} away</span>}
        </div>
      </header>

      {location && (
        <div className={styles.actions}>
          <a
            className={cx(styles.action, styles.primary)}
            href={directionsUrl(location)}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation size={20} aria-hidden="true" />
            Directions
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          {branch ? (
            <a className={styles.action} href={`tel:${branch.phone.replace(/\s/g, '')}`}>
              <Phone size={20} aria-hidden="true" />
              Call
            </a>
          ) : (
            <span className={styles.action} aria-hidden="true">
              <Phone size={20} />
              Call
            </span>
          )}
          <button type="button" className={styles.action} onClick={() => void share()}>
            {shareMessage ? (
              <Check size={20} aria-hidden="true" />
            ) : (
              <Share size={20} aria-hidden="true" />
            )}
            {shareMessage || 'Share'}
          </button>
        </div>
      )}
      <p className="visually-hidden" role="status">
        {shareMessage}
      </p>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
      ) : !branch ? (
        <LoadingRegion label="Loading branch details">
          <div className={styles.loading}>
            <Skeleton height="3rem" radius="14px" />
            <Skeleton width="60%" />
            <Skeleton height="10rem" radius="14px" />
          </div>
        </LoadingRegion>
      ) : (
        <>
          {branch.queue && (
            <div className={styles.queue}>
              <Users size={20} aria-hidden="true" />
              <div>
                <p>
                  <span className={styles.queueValue}>
                    {branch.queue.estimatedWaitMinutes < 3
                      ? 'Little to no wait'
                      : `About ${branch.queue.estimatedWaitMinutes} min wait`}
                  </span>
                </p>
                <p className={styles.queueNote}>
                  Estimate updated {formatTime(branch.queue.updatedAt)}
                </p>
              </div>
            </div>
          )}

          <section className={styles.section} aria-labelledby={`${branchId}-address`}>
            <h3 id={`${branchId}-address`} className={styles.sectionTitle}>
              Address
            </h3>
            <address className={styles.address}>
              {branch.address.street && (
                <>
                  {branch.address.street}
                  <br />
                </>
              )}
              {[branch.address.suburb, branch.address.city].filter(Boolean).join(', ')}{' '}
              {branch.address.postalCode}
            </address>
          </section>

          <section className={styles.section} aria-labelledby={`${branchId}-hours`}>
            <h3 id={`${branchId}-hours`} className={styles.sectionTitle}>
              Opening hours
            </h3>
            <table className={styles.hours}>
              <tbody>
                {DAYS.map((day) => {
                  const hours = branch.hours.find((h) => h.day === day);
                  return (
                    <tr key={day} className={day === today ? styles.today : undefined}>
                      <th scope="row">
                        {dayLabel(day)}
                        {day === today && <span className={styles.todayTag}>Today</span>}
                      </th>
                      <td>{hours ? formatHours(hours) : 'Not listed'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <TagSection
            id={`${branchId}-services`}
            title="Services"
            ids={branch.services}
            options={options?.services}
          />
          {branch.facilities.length > 0 && (
            <TagSection
              id={`${branchId}-facilities`}
              title="Facilities"
              ids={branch.facilities}
              options={options?.facilities}
            />
          )}
        </>
      )}
    </article>
  );
}

function TagSection({
  id,
  title,
  ids,
  options,
}: {
  id: string;
  title: string;
  ids: readonly string[];
  options: readonly { id: string; label: string }[] | undefined;
}) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h3 id={id} className={styles.sectionTitle}>
        {title}
      </h3>
      <ul className={styles.tags}>
        {ids.map((value) => (
          <li key={value} className={styles.tag}>
            <Check size={14} strokeWidth={3} aria-hidden="true" />
            {optionLabel(value, options)}
          </li>
        ))}
      </ul>
    </section>
  );
}
