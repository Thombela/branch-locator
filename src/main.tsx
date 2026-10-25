// Base styles first so component CSS wins ties later in the cascade.
import '@/styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AppProviders } from '@/app/AppProviders';
import { createQueryClient } from '@/app/queryClient';
import { createRouter } from '@/app/router';
import { applyTheme, readTheme } from '@/app/theme';
import { env } from '@/config/env';

// Before anything renders, so a pinned light or dark theme doesn't flash the other one.
applyTheme(readTheme());

async function bootstrap() {
  if (env.enableMocks) {
    // Loaded lazily so the mock layer stays out of the main bundle.
    const { startMockApi } = await import('@/mocks/browser');
    await startMockApi();
  }

  const container = document.getElementById('root');
  if (!container) throw new Error('Root element #root not found');

  createRoot(container).render(
    <StrictMode>
      <AppProviders queryClient={createQueryClient()}>
        <RouterProvider router={createRouter()} />
      </AppProviders>
    </StrictMode>,
  );
}

void bootstrap();
