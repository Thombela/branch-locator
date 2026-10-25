import { setupWorker } from 'msw/browser';
import { createHandlers } from './handlers';

export async function startMockApi(): Promise<void> {
  const worker = setupWorker(...createHandlers());
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}
