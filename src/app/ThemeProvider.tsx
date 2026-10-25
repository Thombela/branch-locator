import { useMemo, useState, type ReactNode } from 'react';
import { readTheme, saveTheme, ThemeContext, type Theme } from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setState] = useState(readTheme);
  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        saveTheme(next);
        setState(next);
      },
    }),
    [theme],
  );
  return <ThemeContext value={value}>{children}</ThemeContext>;
}
