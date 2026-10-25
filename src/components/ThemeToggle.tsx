import { Moon, Sun } from 'lucide-react';
import { useDarkAppearance, useTheme } from '@/app/theme';
import { cx } from '@/lib/cx';
import styles from './ThemeToggle.module.css';

/**
 * Switches between light and dark. Choosing the appearance the OS already uses goes back to
 * following the OS.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();
  const { dark, systemDark } = useDarkAppearance();

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    setTheme(next === (systemDark ? 'dark' : 'light') ? 'system' : next);
  };

  return (
    <button
      type="button"
      className={cx(styles.toggle, className)}
      aria-label="Dark mode"
      aria-pressed={dark}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      {dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  );
}
