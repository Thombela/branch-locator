import type { OpenStatus as Status } from '@/api/schemas';
import { describeOpenStatus } from '@/domain/hours';
import { cx } from '@/lib/cx';
import styles from './OpenStatus.module.css';

/** "Open · Closes 17:00". The state is in words as well as colour. */
export function OpenStatus({ status }: { status: Status }) {
  const { label, detail } = describeOpenStatus(status);
  return (
    <span className={cx(styles.status, status.isOpen ? styles.open : styles.closed)}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      {detail && <span className={styles.detail}>· {detail}</span>}
    </span>
  );
}
