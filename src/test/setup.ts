import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from './server';

/** Monday 16 September 2024, 10:00 in Johannesburg, when branches are open. */
export const TEST_NOW = new Date('2024-09-16T08:00:00Z');

/** Media queries the tests treat as matching. Defaults to a desktop with a mouse. */
let matching = (query: string) =>
  query.includes('min-width: 56rem') || query.includes('pointer: fine');
export function setMediaMatcher(matcher: (query: string) => boolean) {
  matching = matcher;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: matching(query),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
  window.scrollTo = () => undefined;
});

beforeEach(() => {
  // Only fake Date: timers stay real so promises, MSW and Motion keep working.
  vi.useFakeTimers({ toFake: ['Date'], now: TEST_NOW });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  server.resetHandlers();
  vi.useRealTimers();
  setMediaMatcher((query) => query.includes('min-width: 56rem') || query.includes('pointer: fine'));
});

afterAll(() => server.close());
