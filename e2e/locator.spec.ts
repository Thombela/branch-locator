import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const CAPE_TOWN = { latitude: -33.9213, longitude: 18.4239 };

// WebKit checks its own built-in <select> styles against the page's CSP and logs a refusal,
// even though the control renders normally. Only WebKit ignores it; Chromium still fails on
// any inline style the app adds.
const WEBKIT_SELECT_NOISE =
  /^Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline'/;

test.describe('Branch locator', () => {
  // Any console error fails the test, including a Content-Security-Policy violation.
  let consoleErrors: string[] = [];
  test.beforeEach(({ page, browserName }) => {
    consoleErrors = [];
    page.on('console', (message) => {
      const noise = browserName === 'webkit' && WEBKIT_SELECT_NOISE.test(message.text());
      if (message.type() === 'error' && !noise) {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
  });
  test.afterEach(() => {
    expect(consoleErrors).toEqual([]);
  });

  test('shows nearby branches on the map and opens one from its pin', async ({
    page,
    isMobile,
  }) => {
    // On a phone a pin can sit under the floating search or the sheet; the sheet has its own test.
    test.skip(isMobile, 'pin tapping is covered on desktop');
    await page.goto('/');
    await expect(page.getByRole('list', { name: 'Nearby branches' })).toBeVisible();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();

    const first = page.locator('button.branch-pin:not(.is-clustered)').first();
    await expect(first).toHaveAttribute('aria-label', /, (open|closed)$/);
    const label = (await first.getAttribute('aria-label'))!;
    // Find the same pin by its label: clusters change once a branch is selected.
    const pin = page.locator(`button.branch-pin[aria-label="${label}"]`);
    await pin.click();
    const name = label.replace(/, (open|closed)$/, '');
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    await expect(pin).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/branch=br_/);
  });

  test('opens up a cluster of pins that would overlap', async ({ page, isMobile }) => {
    test.skip(isMobile, 'pin tapping is covered on desktop');
    await page.goto('/');
    const cluster = page.locator('button.branch-cluster').first();
    await expect(cluster).toHaveAttribute(
      'aria-label',
      /^\d+ branches here\. Zoom in to see them$/,
    );
    // Wait for the opening camera move to finish, or the cluster can be replaced mid-click.
    await expect
      .poll(async () => {
        const start = await cluster.boundingBox();
        await page.waitForTimeout(300);
        const end = await cluster.boundingBox();
        return start !== null && start.x === end?.x && start.y === end.y;
      })
      .toBe(true);
    const visiblePins = page.locator('button.branch-pin:not(.is-clustered)');
    const before = await visiblePins.count();
    await cluster.click();
    await expect.poll(() => visiblePins.count()).toBeGreaterThan(before);
  });

  test('finds branches near a searched place', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search for a place' }).fill('Sea P');
    await page.getByRole('option', { name: /Sea Point/ }).click();
    await expect(page).toHaveURL(/place=pl_sea_point/);
    // The mock adds up to 600 ms of latency per request, so allow more than the default wait.
    await expect(page.getByText(/within 10 km of Sea Point/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('uses the device location when allowed', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(CAPE_TOWN);
    await page.goto('/');
    await page.getByRole('button', { name: 'Use my location' }).click();
    await expect(page.getByText(/within 10 km of you/).first()).toBeVisible();
    await expect(page.locator('.user-dot')).toBeVisible();
    // The customer's coordinates never appear in the URL.
    expect(page.url()).not.toMatch(/-33\.92|18\.42|lat|lng/);
  });

  test('a shared link opens straight to the branch', async ({ page }) => {
    await page.goto('/?branch=br_cape_town_constitution_house');
    await expect(page.getByRole('heading', { level: 2, name: /Constitution House/ })).toBeVisible();
    await expect(page.getByRole('table')).toContainText('Today');
  });

  test('switches between light and dark from the toggle', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('button.branch-pin').first()).toBeVisible();
    const toggle = page.getByRole('button', { name: 'Dark mode' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // The choice survives a reload, applied before the first paint.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`has no detectable accessibility violations (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      await expect(page.locator('button.branch-pin').first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        // Map labels are drawn on a canvas by the tile style; there is no DOM text to check there.
        .exclude('.maplibregl-canvas')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only behaviour');

  test('results live in a sheet that expands and shows a branch', async ({ page }) => {
    await page.goto('/');
    const handle = page.getByRole('button', { name: 'Expand results' });
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    await handle.click();
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('list', { name: 'Nearby branches' }).getByRole('button').first().click();
    await expect(page.getByRole('button', { name: 'All branches' })).toBeVisible();
  });
});
