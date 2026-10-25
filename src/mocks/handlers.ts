import { delay, http, HttpResponse } from 'msw';
import type { ApiErrorBody } from '@/api/schemas';
import { FACILITIES, SERVICES, loadBranches } from './data/branches';
import { PLACES } from './data/places';
import { branchDetail, searchBranches, searchPlaces, toPlace } from './data/queries';

export interface MockApiOptions {
  /** Clock for opening hours and queues, passed in so tests are repeatable. */
  now?: () => Date;
  /** Simulated network latency range in ms; `[0, 0]` in tests. */
  latency?: [number, number];
}

class BadRequest extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function error(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
}

function number(
  params: URLSearchParams,
  name: string,
  { min, max, fallback }: { min: number; max: number; fallback?: number },
): number {
  const raw = params.get(name);
  if (raw === null || raw === '') {
    if (fallback === undefined)
      throw new BadRequest(`MISSING_${name.toUpperCase()}`, `${name} is required.`);
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new BadRequest(
      `INVALID_${name.toUpperCase()}`,
      `${name} must be between ${min} and ${max}.`,
    );
  }
  return value;
}

export function createHandlers({
  now = () => new Date(),
  latency = [200, 600],
}: MockApiOptions = {}) {
  const branches = loadBranches();
  const validServices = new Set<string>(SERVICES.map((s) => s.id));

  const simulateLatency = async () => {
    const [min, max] = latency;
    if (max > 0) await delay(Math.round(min + Math.random() * (max - min)));
  };

  const guard =
    (resolver: (url: URL, params: Record<string, string>) => Response) =>
    async ({
      request,
      params,
    }: {
      request: Request;
      params: Record<string, string | readonly string[] | undefined>;
    }) => {
      await simulateLatency();
      try {
        return resolver(new URL(request.url), params as Record<string, string>);
      } catch (caught) {
        if (caught instanceof BadRequest) return error(400, caught.code, caught.message);
        throw caught;
      }
    };

  return [
    // Registered before `/branches/:id` so "filters" isn't treated as an ID.
    http.get(
      '*/api/branches/filters',
      guard(() =>
        HttpResponse.json({
          services: SERVICES,
          facilities: FACILITIES,
          radiusOptionsKm: [5, 10, 25, 50],
        }),
      ),
    ),

    http.get(
      '*/api/branches/:branchId',
      guard((_url, { branchId }) => {
        const branch = branches.find((b) => b.id === branchId);
        if (!branch) return error(404, 'BRANCH_NOT_FOUND', 'We couldn’t find that branch.');
        return HttpResponse.json(branchDetail(branch, now()));
      }),
    ),

    http.get(
      '*/api/branches',
      guard((url) => {
        const params = url.searchParams;
        const services = (params.get('services') ?? '').split(',').filter(Boolean);
        const unknown = services.find((service) => !validServices.has(service));
        if (unknown) throw new BadRequest('INVALID_SERVICE', `Unknown service "${unknown}".`);
        return HttpResponse.json(
          searchBranches(
            branches,
            {
              origin: {
                lat: number(params, 'lat', { min: -90, max: 90 }),
                lng: number(params, 'lng', { min: -180, max: 180 }),
              },
              radiusKm: number(params, 'radiusKm', { min: 1, max: 100, fallback: 10 }),
              services,
              openNow: params.get('openNow') === 'true',
              limit: Math.floor(number(params, 'limit', { min: 1, max: 50, fallback: 20 })),
            },
            now(),
          ),
        );
      }),
    ),

    http.get(
      '*/api/places/:placeId',
      guard((_url, { placeId }) => {
        const place = PLACES.find((p) => p.id === placeId);
        if (!place) return error(404, 'PLACE_NOT_FOUND', 'We couldn’t find that place.');
        return HttpResponse.json(toPlace(place));
      }),
    ),

    http.get(
      '*/api/places',
      guard((url) => {
        const query = url.searchParams.get('query') ?? '';
        if (query.trim().length < 2)
          throw new BadRequest('QUERY_TOO_SHORT', 'Type at least two characters.');
        const limit = Math.floor(
          number(url.searchParams, 'limit', { min: 1, max: 10, fallback: 6 }),
        );
        return HttpResponse.json({ places: searchPlaces(query, limit) });
      }),
    ),
  ];
}
