import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { FakeBranchMap } from '@/test/FakeBranchMap';
import { currentUrl, renderApp } from '@/test/render';
import { server } from '@/test/server';
import { setMediaMatcher } from '@/test/setup';

vi.mock('@/features/map/BranchMap', () => ({ BranchMap: FakeBranchMap }));

const list = () => screen.findByRole('list', { name: 'Nearby branches' });

function mockGeolocation(
  result: { coords: { latitude: number; longitude: number; accuracy: number } } | { code: number },
) {
  const geolocation = {
    getCurrentPosition: (success: PositionCallback, failure: PositionErrorCallback) => {
      if ('coords' in result) success(result as unknown as GeolocationPosition);
      else
        failure({
          code: result.code,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: '',
        });
    },
  };
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true });
}

describe('Branch locator', () => {
  it('starts with branches near Cape Town CBD, nearest first', async () => {
    renderApp();
    const branches = within(await list()).getAllByRole('button');
    expect(branches).toHaveLength(20);
    expect(screen.getByText(/\d+ branches within 10 km of Cape Town CBD/)).toBeInTheDocument();
    expect(branches[0]).toHaveTextContent(/Open\W+(Closes \d\d:00|24 hours)/);
  });

  it('searches for a place from the keyboard and keeps it in the URL', async () => {
    const { user, router } = renderApp();
    await list();
    const combobox = screen.getByRole('combobox', { name: 'Search for a place' });
    await user.type(combobox, 'sea p');
    expect(await screen.findByRole('option', { name: /Sea Point/ })).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(currentUrl(router)).toBe('/?place=pl_sea_point'));
    expect(await screen.findByText(/within 10 km of Sea Point/)).toBeInTheDocument();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a branch, moves focus to it, and goes back to the list', async () => {
    const { user, router } = renderApp();
    const name = 'Capitec Bank Cape Town Golden Acre';
    await user.click(within(await list()).getByRole('button', { name: new RegExp(`^${name}`) }));

    const heading = await screen.findByRole('heading', { level: 2, name });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(currentUrl(router)).toMatch(/^\/\?branch=br_/);
    expect(await screen.findByRole('table')).toHaveTextContent(/MondayToday/);
    expect(screen.getByRole('link', { name: /Directions/ })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir'),
    );
    expect(screen.getByText(/min wait|Little to no wait/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All branches' }));
    expect(await list()).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/');
  });

  it('selects a branch from its map pin', async () => {
    const { user } = renderApp();
    await list();
    const pin = screen.getAllByRole('button', { name: /^Pin: / })[1]!;
    await user.click(pin);
    expect(
      await screen.findByRole('heading', { level: 2, name: pin.textContent.replace('Pin: ', '') }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveAttribute(
      'data-selected',
      expect.stringMatching(/^br_/),
    );
  });

  it('filters by service and keeps filters in the URL', async () => {
    const { user, router } = renderApp();
    await list();
    await user.click(await screen.findByRole('button', { name: 'Smart ID' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/?services=smart_id'));
    expect(screen.getByRole('button', { name: 'Smart ID' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('offers to widen the search when nothing is nearby', async () => {
    server.use(
      http.get('*/api/branches', () =>
        HttpResponse.json({ origin: { lat: 0, lng: 0 }, radiusKm: 10, total: 0, branches: [] }),
      ),
    );
    const { user, router } = renderApp();
    expect(await screen.findByText('No branches here')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search a wider area' }));
    await waitFor(() => expect(currentUrl(router)).toBe('/?radius=25'));
  });

  it('uses the device location without putting it in the URL', async () => {
    mockGeolocation({ coords: { latitude: -33.9213, longitude: 18.4239, accuracy: 30 } });
    const { user, router } = renderApp();
    await list();
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/within 10 km of you/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use my location' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('map')).toHaveAttribute('data-user', 'shown');
    expect(currentUrl(router)).toBe('/');
  });

  it('explains what to do when location access is refused', async () => {
    mockGeolocation({ code: 1 });
    const { user } = renderApp();
    await list();
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Location access is off/);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers “Search this area” after the map is panned', async () => {
    const { user } = renderApp();
    await list();
    await user.click(screen.getByRole('button', { name: 'Pan map to Woodstock' }));
    await user.click(await screen.findByRole('button', { name: 'Search this area' }));
    expect(await screen.findByText(/within 10 km of this area/)).toBeInTheDocument();
  });

  it('opens a shared branch link and centres the search on it', async () => {
    renderApp('/?branch=br_cape_town_constitution_house');
    expect(
      await screen.findByRole('heading', { level: 2, name: /Constitution House/ }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/away$/)).toHaveTextContent(/^\d+ m away$/));
  });

  it('uses a draggable sheet on phones', async () => {
    setMediaMatcher(() => false);
    const { user } = renderApp();
    const toggle = await screen.findByRole('button', { name: 'Expand results' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await act(async () => {
      await user.click(within(await list()).getAllByRole('button')[0]!);
    });
    expect(await screen.findByRole('button', { name: 'All branches' })).toBeInTheDocument();
  });

  it('switches to dark mode and back from the top bar', async () => {
    const { user } = renderApp();
    await list();
    const toggle = screen.getByRole('button', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('branch-locator:theme')).toBe('dark');

    // Back to light, which is what the OS uses here, so it follows the OS again.
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem('branch-locator:theme')).toBeNull();
  });

  it('offers the appearance toggle beside the search on phones', async () => {
    setMediaMatcher(() => false);
    const { user } = renderApp();
    await user.click(await screen.findByRole('button', { name: 'Dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('recovers from a failed search', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/branches', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: { code: 'DOWN', message: 'Branch search is unavailable.' } },
              { status: 503 },
            )
          : undefined;
      }),
    );
    const { user } = renderApp();
    expect(await screen.findByText('Branch search is unavailable.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await list()).toBeInTheDocument();
  });
});
