import { CircleAlert, RotateCw, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { describeError } from '@/api/client';
import { cx } from '@/lib/cx';
import { Button } from './Button';
import styles from './States.module.css';

export function Skeleton({
  width = '100%',
  height = '1rem',
  radius,
  className,
}: {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  className?: string;
}) {
  return (
    <span
      className={cx(styles.skeleton, className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** Announces initial loading once to screen readers while skeletons hold the layout. */
export function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({
  title = 'This section didn’t load',
  error,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <div className={styles.state} role="alert">
      <span className={cx(styles.icon, styles.errorIcon)}>
        <CircleAlert size={22} aria-hidden="true" />
      </span>
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{describeError(error)}</p>
      {onRetry && (
        <Button className={styles.action} size="small" onClick={onRetry} loading={retrying}>
          {!retrying && <RotateCw size={15} aria-hidden="true" />}
          Try again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <span className={styles.icon}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className={styles.title}>{title}</p>
      {message && <p className={styles.message}>{message}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
