import type { LatLng } from './schemas';
import { apiGet } from './client';
import {
  branchDetailSchema,
  branchSearchSchema,
  filterOptionsSchema,
  placeSchema,
  placeSearchSchema,
} from './schemas';

export interface BranchQuery {
  origin: LatLng;
  radiusKm: number;
  services: readonly string[];
  openNow: boolean;
  limit?: number;
}

/** Coordinates are rounded to ~11 m: plenty for a branch search, and less precise than the device fix. */
const coord = (value: number) => Math.round(value * 10_000) / 10_000;

export const api = {
  searchBranches: (query: BranchQuery, signal?: AbortSignal) =>
    apiGet('/api/branches', branchSearchSchema, {
      query: {
        lat: coord(query.origin.lat),
        lng: coord(query.origin.lng),
        radiusKm: query.radiusKm,
        services: query.services.length ? query.services.join(',') : undefined,
        openNow: query.openNow || undefined,
        limit: query.limit,
      },
      signal,
    }),

  getBranch: (id: string, signal?: AbortSignal) =>
    apiGet(`/api/branches/${encodeURIComponent(id)}`, branchDetailSchema, { signal }),

  getFilters: (signal?: AbortSignal) =>
    apiGet('/api/branches/filters', filterOptionsSchema, { signal }),

  searchPlaces: (query: string, signal?: AbortSignal) =>
    apiGet('/api/places', placeSearchSchema, { query: { query }, signal }),

  getPlace: (id: string, signal?: AbortSignal) =>
    apiGet(`/api/places/${encodeURIComponent(id)}`, placeSchema, { signal }),
};
