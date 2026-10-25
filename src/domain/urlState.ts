import type { FilterState } from '@/features/locator/Filters';

/**
 * The URL holds the selected branch, a searched place and the filters, which is enough to
 * share a link. It doesn't hold the customer's own coordinates.
 */
export const DEFAULT_RADIUS_KM = 10;

export function readFilters(
  params: URLSearchParams,
  allowedRadii: readonly number[] = [5, 10, 25, 50],
): FilterState {
  const radius = Number(params.get('radius'));
  return {
    openNow: params.get('open') === '1',
    services: (params.get('services') ?? '').split(',').filter(Boolean),
    radiusKm: allowedRadii.includes(radius) ? radius : DEFAULT_RADIUS_KM,
  };
}

export function writeFilters(params: URLSearchParams, filters: FilterState): URLSearchParams {
  const next = new URLSearchParams(params);
  if (filters.openNow) next.set('open', '1');
  else next.delete('open');
  if (filters.services.length) next.set('services', filters.services.join(','));
  else next.delete('services');
  if (filters.radiusKm !== DEFAULT_RADIUS_KM) next.set('radius', String(filters.radiusKm));
  else next.delete('radius');
  return next;
}

export function hasActiveFilters(filters: FilterState): boolean {
  return filters.openNow || filters.services.length > 0;
}
