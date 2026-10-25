import { useRouteError } from 'react-router';
import { ErrorState } from '@/components/States';
import styles from './RouteError.module.css';

/** Catches render errors so the customer never sees a blank screen. */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className={styles.page}>
      <ErrorState
        title="Something went wrong"
        error={error}
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}
