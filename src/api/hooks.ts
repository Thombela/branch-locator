import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { api, type BranchQuery } from './endpoints';

export const queryKeys = {
  branches: (query: BranchQuery) => ['branches', 'search', query] as const,
  branch: (id: string) => ['branches', 'detail', id] as const,
  filters: ['branches', 'filters'] as const,
  places: (query: string) => ['places', 'search', query] as const,
  place: (id: string) => ['places', 'detail', id] as const,
};

/** Pass `null` until there is an origin to search from; nothing is requested before then. */
export function useBranchSearch(query: BranchQuery | null) {
  return useQuery({
    queryKey: queryKeys.branches(
      query ?? { origin: { lat: 0, lng: 0 }, radiusKm: 0, services: [], openNow: false },
    ),
    queryFn: ({ signal }) => api.searchBranches(query as BranchQuery, signal),
    enabled: query !== null,
    placeholderData: keepPreviousData,
    // "Open now" is time-sensitive: refresh every few minutes while the page is open.
    refetchInterval: 5 * 60_000,
  });
}

export function useBranch(id: string | null) {
  return useQuery({
    queryKey: queryKeys.branch(id ?? ''),
    queryFn: ({ signal }) => api.getBranch(id ?? '', signal),
    enabled: id !== null,
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: queryKeys.filters,
    queryFn: ({ signal }) => api.getFilters(signal),
    staleTime: Infinity,
  });
}

/** Debounced type-ahead; nothing is sent until there are at least two characters. */
export function usePlaceSearch(text: string) {
  const query = useDebouncedValue(text.trim(), 200);
  return useQuery({
    queryKey: queryKeys.places(query),
    queryFn: ({ signal }) => api.searchPlaces(query, signal),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });
}

export function usePlace(id: string | null) {
  return useQuery({
    queryKey: queryKeys.place(id ?? ''),
    queryFn: ({ signal }) => api.getPlace(id ?? '', signal),
    enabled: id !== null,
    // Keep the previous place while the next loads, so the map stays mounted while switching.
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });
}
