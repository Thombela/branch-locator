import { Outlet } from 'react-router';
import { CapitecLogo } from '@/components/CapitecLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import styles from './AppShell.module.css';

export function AppShell() {
  // The top bar only shows on larger screens; phones get the toggle beside the search instead.
  const desktop = useMediaQuery('(min-width: 56rem)');

  return (
    <>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.topBar}>
        <span className={styles.brand}>
          <CapitecLogo className={styles.logo} />
          <span className={styles.brandName}>Branch Locator</span>
        </span>
        {desktop && <ThemeToggle className={styles.themeToggle} />}
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
