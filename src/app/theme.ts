import { createContext, useContext } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { readPreference, writePreference } from '@/lib/storage';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'theme';
/** Browser chrome colour for each appearance, matching `--bg` in tokens.css. */
const THEME_COLOR: Record<Exclude<Theme, 'system'>, string> = { light: '#f5f5f7', dark: '#000000' };

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function readTheme(): Theme {
  const stored = readPreference(STORAGE_KEY);
  return isTheme(stored) ? stored : 'system';
}

/**
 * `system` follows the OS through `prefers-color-scheme`; light and dark are pinned with
 * `data-theme` on <html>. Runs before the first render so a pinned theme doesn't flash.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;

  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.dataset.default ??= meta.content;
    meta.content = theme === 'system' ? meta.dataset.default : THEME_COLOR[theme];
  }
}

export function saveTheme(theme: Theme): void {
  writePreference(STORAGE_KEY, theme === 'system' ? null : theme);
  applyTheme(theme);
}

export interface ThemeSetting {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeSetting | null>(null);

export function useTheme(): ThemeSetting {
  const setting = useContext(ThemeContext);
  if (!setting) throw new Error('useTheme must be used inside <ThemeProvider>');
  return setting;
}

/** Whether the app is showing dark, whether the customer chose it or the OS did. */
export function useDarkAppearance(): { dark: boolean; systemDark: boolean } {
  const { theme } = useTheme();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return { dark: theme === 'system' ? systemDark : theme === 'dark', systemDark };
}
